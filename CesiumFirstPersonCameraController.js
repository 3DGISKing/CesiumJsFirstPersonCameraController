"use strict";

Cesium.FirstPersonCameraController = (function () {
    const Cartesian3 = Cesium.Cartesian3;
    
    let DIRECTION_NONE = -1;

    const DIRECTION_FORWARD = 0;
    const DIRECTION_BACKWARD = 1;
    const DIRECTION_LEFT = 2;
    const DIRECTION_RIGHT = 3;

    const HUMAN_WALKING_SPEED = 1.5;

    const HUMAN_EYE_HEIGHT = 1.65;
    const MAX_PITCH_IN_DEGREE = 88;
    const ROTATE_SPEED = -5;

    function CesiumFirstPersonCameraController(options) {
        this._enabled = false;
        this._cesiumViewer = options.cesiumViewer;
        this._canvas = this._cesiumViewer.canvas;
        this._camera = this._cesiumViewer.camera;

        this._connectEventHandlers();
    }

    CesiumFirstPersonCameraController.prototype._connectEventHandlers = function () {
        const canvas = this._cesiumViewer.canvas;

        this._screenSpaceEventHandler = new Cesium.ScreenSpaceEventHandler(this._canvas);

        this._screenSpaceEventHandler.setInputAction(this._onMouseLButtonClicked.bind(this), Cesium.ScreenSpaceEventType.LEFT_DOWN);
        this._screenSpaceEventHandler.setInputAction(this._onMouseUp.bind(this), Cesium.ScreenSpaceEventType.LEFT_UP);
        this._screenSpaceEventHandler.setInputAction(this._onMouseMove.bind(this),Cesium.ScreenSpaceEventType.MOUSE_MOVE);
        this._screenSpaceEventHandler.setInputAction(this._onMouseLButtonDoubleClicked.bind(this), Cesium.ScreenSpaceEventType.LEFT_DOUBLE_CLICK);

        // needed to put focus on the canvas
        canvas.setAttribute("tabindex", "0");

        canvas.onclick = function () {
            canvas.focus();
        };

        canvas.addEventListener("keydown", this._onKeyDown.bind(this));
        canvas.addEventListener("keyup", this._onKeyUp.bind(this));

        this._disconectOnClockTick = this._cesiumViewer.clock.onTick.addEventListener(CesiumFirstPersonCameraController.prototype._onClockTick, this);
    };

    CesiumFirstPersonCameraController.prototype._onMouseLButtonClicked = function (movement) {
        this._looking = true;
        this._mousePosition = this._startMousePosition = Cartesian3.clone(movement.position);
    };

    CesiumFirstPersonCameraController.prototype._onMouseLButtonDoubleClicked = function (movement) {
        this._looking = true;
        this._mousePosition = this._startMousePosition = Cartesian3.clone(movement.position);
    };

    CesiumFirstPersonCameraController.prototype._onMouseUp = function (position) {
        this._looking = false;
    };

    CesiumFirstPersonCameraController.prototype._onMouseMove = function (movement) {
        this._mousePosition = movement.endPosition;
    };

    CesiumFirstPersonCameraController.prototype._onKeyDown = function (event) {
        const keyCode = event.keyCode;

        this._direction = DIRECTION_NONE;

        switch (keyCode) {
            case "W".charCodeAt(0):
                this._direction = DIRECTION_FORWARD;
                return;
            case "S".charCodeAt(0):
                this._direction = DIRECTION_BACKWARD;
                return;
            case "D".charCodeAt(0):
                this._direction = DIRECTION_RIGHT;
                return;
            case "A".charCodeAt(0):
                this._direction = DIRECTION_LEFT;
                return;
            case 90: // z
                return;
            default:
                return;
        }
    };

    CesiumFirstPersonCameraController.prototype._onKeyUp = function () {
        this._direction = DIRECTION_NONE;
    };

    CesiumFirstPersonCameraController.prototype._changeHeadingPitch = function (dt) {
        let width = this._canvas.clientWidth;
        let height = this._canvas.clientHeight;

        // Coordinate (0.0, 0.0) will be where the mouse was clicked.
        let deltaX = (this._mousePosition.x - this._startMousePosition.x) / width;
        let deltaY = -(this._mousePosition.y - this._startMousePosition.y) / height;

        let currentHeadingInDegree = Cesium.Math.toDegrees(this._camera.heading);
        let deltaHeadingInDegree = (deltaX * ROTATE_SPEED);
        let newHeadingInDegree = currentHeadingInDegree + deltaHeadingInDegree;

        let currentPitchInDegree = Cesium.Math.toDegrees(this._camera.pitch);
        let deltaPitchInDegree = (deltaY * ROTATE_SPEED);
        let newPitchInDegree = currentPitchInDegree + deltaPitchInDegree;

        console.log( "rotationSpeed: " + ROTATE_SPEED + " deltaY: " + deltaY + " deltaPitchInDegree" + deltaPitchInDegree);

        if( newPitchInDegree > MAX_PITCH_IN_DEGREE * 2 && newPitchInDegree < 360 - MAX_PITCH_IN_DEGREE) {
            newPitchInDegree = 360 - MAX_PITCH_IN_DEGREE;
        }
        else {
            if (newPitchInDegree > MAX_PITCH_IN_DEGREE && newPitchInDegree < 360 - MAX_PITCH_IN_DEGREE) {
                newPitchInDegree = MAX_PITCH_IN_DEGREE;
            }
        }

        this._camera.setView({
            orientation: {
                heading : Cesium.Math.toRadians(newHeadingInDegree),
                pitch : Cesium.Math.toRadians(newPitchInDegree),
                roll : this._camera.roll
            }
        });
    };

    let scratchCurrentDirection = new Cartesian3();
    let scratchDeltaPosition = new Cartesian3();
    let scratchNextPosition = new Cartesian3();
    let scratchTerrainConsideredNextPosition = new Cartesian3();
    let scratchNextCartographic = new Cesium.Cartographic();

    CesiumFirstPersonCameraController.prototype._onClockTick = function (clock) {
        if(!this._enabled)
            return;

        let dt = clock._clockStep;

        if(this._looking)
            this._changeHeadingPitch(dt);

        if(this._direction === DIRECTION_NONE)
            return;

        let distance = this._walkingSpeed() * dt;

        if(this._direction === DIRECTION_FORWARD)
            Cartesian3.multiplyByScalar(this._camera.direction, 1, scratchCurrentDirection);
        else if(this._direction === DIRECTION_BACKWARD)
            Cartesian3.multiplyByScalar(this._camera.direction, -1, scratchCurrentDirection);
        else if(this._direction === DIRECTION_LEFT)
            Cartesian3.multiplyByScalar(this._camera.right, -1, scratchCurrentDirection);
        else if(this._direction === DIRECTION_RIGHT)
            Cartesian3.multiplyByScalar(this._camera.right, 1, scratchCurrentDirection);

        Cartesian3.multiplyByScalar(scratchCurrentDirection, distance, scratchDeltaPosition);

        let currentCameraPosition = this._camera.position;

        Cartesian3.add(currentCameraPosition, scratchDeltaPosition, scratchNextPosition);

        // consider terrain height

        let globe = this._cesiumViewer.scene.globe;
        let ellipsoid = globe.ellipsoid;

        // get height for next update position
        ellipsoid.cartesianToCartographic(scratchNextPosition, scratchNextCartographic);

        let height = globe.getHeight(scratchNextCartographic);

        if(height === undefined) {
            console.warn('height is undefined!');
            return;
        }

        if(height < 0) {
            console.warn(`height is negative!`);
        }

        scratchNextCartographic.height = height + HUMAN_EYE_HEIGHT;

        ellipsoid.cartographicToCartesian(scratchNextCartographic, scratchTerrainConsideredNextPosition);

        this._camera.setView({
            destination: scratchTerrainConsideredNextPosition,
            orientation: new Cesium.HeadingPitchRoll(this._camera.heading, this._camera.pitch, this._camera.roll),
            endTransform : Cesium.Matrix4.IDENTITY
        });
    };

    CesiumFirstPersonCameraController.prototype._walkingSpeed = function (){
        return HUMAN_WALKING_SPEED;
    };

    CesiumFirstPersonCameraController.prototype._enableDefaultScreenSpaceCameraController = function (enabled) {
        const scene = this._cesiumViewer.scene;

        // disable the default event handlers

        scene.screenSpaceCameraController.enableRotate = enabled;
        scene.screenSpaceCameraController.enableTranslate = enabled;
        scene.screenSpaceCameraController.enableZoom = enabled;
        scene.screenSpaceCameraController.enableTilt = enabled;
        scene.screenSpaceCameraController.enableLook = enabled;
    };

    CesiumFirstPersonCameraController.prototype.start = function () {
        this._enabled = true;

        this._enableDefaultScreenSpaceCameraController(false);

        let currentCameraPosition = this._camera.position;

        let cartographic = new Cesium.Cartographic();

        let globe = this._cesiumViewer.scene.globe;

        globe.ellipsoid.cartesianToCartographic(currentCameraPosition, cartographic);

        let height = globe.getHeight(cartographic);

        if(height === undefined)
            return false;

        if(height < 0) {
            console.warn(`height is negative`);
        }

        cartographic.height = height + HUMAN_EYE_HEIGHT;

        let newCameraPosition = new Cartesian3();

        globe.ellipsoid.cartographicToCartesian(cartographic, newCameraPosition);

        let currentCameraHeading = this._camera.heading;

        this._heading = currentCameraHeading;

        this._camera.flyTo({
            destination : newCameraPosition,
            orientation : {
                heading : currentCameraHeading,
                pitch : Cesium.Math.toRadians(0),
                roll : 0.0
            }
        });

        return true;
    };

    CesiumFirstPersonCameraController.prototype.stop = function () {
        this._enabled = false;

        this._enableDefaultScreenSpaceCameraController(false);
    };

    return CesiumFirstPersonCameraController;
})();