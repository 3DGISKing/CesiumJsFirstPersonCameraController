CesiumFPS.CesiumFPSCameraController = (function () {
    // this mean person is stop
    var DIRECTION_NONE = -1;

    var DIRECTION_FORWARD = 0;
    var DIRECTION_BACKWARD = 1;
    var DIRECTION_LEFT = 2;
    var DIRECTION_RIGHT = 3;

    var HUMAN_WALKING_SPEED = 1.5;

    var HUMAN_EYE_HEIGHT = 10; // 1.4;
    var MAX_PITCH_IN_DEGREE = 88;
    var ROTATE_SPEED = -5;

    //constructor
    function _(cesiumViewer) {
        this._enabled = false;
        this._cesiumViewer = cesiumViewer;
        this._canvas = cesiumViewer.canvas;
        this._camera = cesiumViewer.camera;

        this._direction = DIRECTION_NONE;
        this._walkingSpeed = HUMAN_WALKING_SPEED;

        /**
         * heading: angle with up direction
         * pitch:   angle with right direction
         * roll:    angle with look at direction
         */

        // indicate if heading and pitch is changed
        this._looking = false;

        this._init();
    }

    _.prototype._init = function () {
        var canvas = this._cesiumViewer.canvas;

        this._startMousePosition = null;
        this._mousePosition = null;

        this._screenSpaceHandler = new Cesium.ScreenSpaceEventHandler(canvas);

        var self = this;

        this._screenSpaceHandler.setInputAction(function(movement) {
            self._onMouseLButtonClicked(movement)
        }, Cesium.ScreenSpaceEventType.LEFT_DOWN);

        this._screenSpaceHandler.setInputAction(function(movement) {
            self._onMouseMove(movement);
        }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);

        this._screenSpaceHandler.setInputAction(function(movement) {
            self._onMouseUp(movement);
        }, Cesium.ScreenSpaceEventType.LEFT_UP);

        // needed to put focus on the canvas
        canvas.setAttribute('tabindex', '0');

        canvas.onclick = function() {
            canvas.focus();
        };

        document.addEventListener('keydown', function(e) {
            self._onKeyDown(e.keyCode);
        }, false);

        document.addEventListener('keyup', function(e) {
            self._onKeyUp(e.keyCode);
        }, false);

        this._cesiumViewer.clock.onTick.addEventListener(function(clock) {
            self._onClockTick(clock);
        });
    };

    _.prototype.enable = function () {
        this._enabled = true;

        var scene = this._cesiumViewer.scene;

        // disable the default event handlers

        scene.screenSpaceCameraController.enableRotate = false;
        scene.screenSpaceCameraController.enableTranslate = false;
        scene.screenSpaceCameraController.enableZoom = false;
        scene.screenSpaceCameraController.enableTilt = false;
        scene.screenSpaceCameraController.enableLook = false;

        var currentCameraPosition = this._camera.position;

        var cartographic = new Cesium.Cartographic();

        var globe = this._cesiumViewer.scene.globe;

        globe.ellipsoid.cartesianToCartographic(currentCameraPosition, cartographic);

        var height = globe.getHeight(cartographic);

        if(height == undefined)
            return false;

        if(height < 0)
            return false;

        cartographic.height = height + HUMAN_EYE_HEIGHT;

        var newCameraPosition = new Cesium.Cartesian3();

        globe.ellipsoid.cartographicToCartesian(cartographic, newCameraPosition);

        var currentCameraHeading = this._camera.heading;

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

    _.prototype.disable = function () {
        this._enabled = false;

        var scene = this._cesiumViewer.scene;

        // enable the default event handlers

        scene.screenSpaceCameraController.enableRotate = true;
        scene.screenSpaceCameraController.enableTranslate = true;
        scene.screenSpaceCameraController.enableZoom = true;
        scene.screenSpaceCameraController.enableTilt = true;
        scene.screenSpaceCameraController.enableLook = true;
    };

    _.prototype._onKeyDown = function (keyCode) {
        this._direction = DIRECTION_NONE;

        switch (keyCode) {
            case 'W'.charCodeAt(0):
                this._direction = DIRECTION_FORWARD;
                return;
            case 'S'.charCodeAt(0):
                this._direction = DIRECTION_BACKWARD;
                return;
            case 'Q'.charCodeAt(0):
                return 'moveUp';
            case 'E'.charCodeAt(0):
                return 'moveDown';
            case 'D'.charCodeAt(0):
                this._direction = DIRECTION_RIGHT;
                return;
            case 'A'.charCodeAt(0):
                this._direction = DIRECTION_LEFT;
                return;
            default:
                return undefined;
        }
    };

    _.prototype._onKeyUp = function (keyCode) {
        this._direction = DIRECTION_NONE;
    };

    _.prototype._onMouseLButtonClicked = function (movement) {
        this._looking = true;
        this._mousePosition = this._startMousePosition = Cesium.Cartesian3.clone(movement.position);
    };

    _.prototype._onMouseMove = function (movement) {
        this._mousePosition = movement.endPosition;
    };

    _.prototype._onMouseUp = function (position) {
        this._looking = false;
    };

    _.prototype._changeHeadingPitch = function (dt) {
        var width = this._canvas.clientWidth;
        var height = this._canvas.clientHeight;

        // Coordinate (0.0, 0.0) will be where the mouse was clicked.
        var deltaX = (this._mousePosition.x - this._startMousePosition.x) / width;
        var deltaY = -(this._mousePosition.y - this._startMousePosition.y) / height;

        var currentHeadingInDegree = Cesium.Math.toDegrees(this._camera.heading);
        var deltaHeadingInDegree = (deltaX * ROTATE_SPEED);
        var newHeadingInDegree = currentHeadingInDegree + deltaHeadingInDegree;

        var currentPitchInDegree = Cesium.Math.toDegrees(this._camera.pitch);
        var deltaPitchInDegree = (deltaY * ROTATE_SPEED);
        var newPitchInDegree = currentPitchInDegree + deltaPitchInDegree;

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

    _.prototype._onClockTick = function (clock) {
        if(!this._enabled)
            return;

        var dt = clock._clockStep;

        if(this._looking)
            this._changeHeadingPitch(dt);

        var distance = this._walkingSpeed * dt;

        if(this._direction == DIRECTION_NONE)
            return;

        var direction = new Cesium.Cartesian3();

        if(this._direction == DIRECTION_FORWARD)
            Cesium.Cartesian3.multiplyByScalar(this._camera.direction, 1, direction);
        else if(this._direction == DIRECTION_BACKWARD)
            Cesium.Cartesian3.multiplyByScalar(this._camera.direction, -1, direction);
        else if(this._direction == DIRECTION_LEFT)
            Cesium.Cartesian3.multiplyByScalar(this._camera.right, -1, direction);
        else if(this._direction == DIRECTION_RIGHT)
            Cesium.Cartesian3.multiplyByScalar(this._camera.right, 1, direction);

        var stepPosition = new Cesium.Cartesian3();

        Cesium.Cartesian3.multiplyByScalar(direction, distance, stepPosition);

        var currentCameraPosition = this._camera.position;

        var endPosition = new Cesium.Cartesian3();

        Cesium.Cartesian3.add(currentCameraPosition, stepPosition, endPosition);

        // consider terrain height

        var globe = this._cesiumViewer.scene.globe;
        var ellipsoid = globe.ellipsoid;

        var cartographic = new Cesium.Cartographic();

        ellipsoid.cartesianToCartographic(endPosition, cartographic);

        var height = globe.getHeight(cartographic);

        if(height == undefined)
            return;

        if(height < 0)
            return;

        cartographic.height = height + HUMAN_EYE_HEIGHT;

        ellipsoid.cartographicToCartesian(cartographic, endPosition);

        this._camera.setView({
            destination: endPosition,
            orientation: new Cesium.HeadingPitchRoll(this._camera.heading, this._camera.pitch, this._camera.roll),
            endTransform : Cesium.Matrix4.IDENTITY
        });

        // initialize

        this._direction = DIRECTION_NONE;
    };

    return _;
})();