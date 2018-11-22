CesiumFPS.CesiumFPSCameraController = (function () {
    // this mean person is stop
    var DIRECTION_NONE = 0;

    var DIRECTION_FORWARD = 1;
    var BACKWARD_DIRECTION = -1;

    var STEER_NONE = 0;
    var STEER_RIGHT = 1;
    var STEER_LEFT = -1;

    var HEADING_STEP = 4; // in degree

    var HUMAN_WALKING_SPEED = 1.5;

    var HUMAN_EYE_HEIGHT = 10; // 1.4;

    //constructor
    function _(cesiumViewer) {
        this._enabled = false;
        this._cesiumViewer = cesiumViewer;
        this._camera = cesiumViewer.camera;

        this._direction = DIRECTION_NONE;
        this._walkingSpeed = HUMAN_WALKING_SPEED;
        this._steer = STEER_NONE;

        this._heading = 0; // in radians

        this._init();
    }

    _.prototype._init = function () {
        var canvas = this._cesiumViewer.canvas;

        // needed to put focus on the canvas
        canvas.setAttribute('tabindex', '0');

        canvas.onclick = function() {
            canvas.focus();
        };

        var self = this;

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
        this._steer = STEER_NONE;

        switch (keyCode) {
            case 'W'.charCodeAt(0):
                this._direction = DIRECTION_FORWARD;
                return;
            case 'S'.charCodeAt(0):
                this._direction = BACKWARD_DIRECTION;
                return;
            case 'Q'.charCodeAt(0):
                return 'moveUp';
            case 'E'.charCodeAt(0):
                return 'moveDown';
            case 'D'.charCodeAt(0):
                this._steer = STEER_RIGHT;
                return;
            case 'A'.charCodeAt(0):
                this._steer = STEER_LEFT;
                return;
            default:
                return undefined;
        }
    };

    _.prototype._onKeyUp = function (keyCode) {
        this._direction = DIRECTION_NONE;
    };

    _.prototype._onClockTick = function (clock) {
        if(!this._enabled)
            return;

        var dt = clock._clockStep;

        var distance = this._walkingSpeed * this._direction * dt;

        if(this._direction == DIRECTION_NONE && this._steer == STEER_NONE)
            return;

        var currentCameraLookAtDirection = this._camera.direction;

        var stepPosition = new Cesium.Cartesian3();

        Cesium.Cartesian3.multiplyByScalar(currentCameraLookAtDirection, distance, stepPosition);

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

        // determine heading

        var deltaHeading = Cesium.Math.toRadians(HEADING_STEP * this._steer * dt);

        this._heading += deltaHeading;

        // update camera
        /*
        // this is source level

        this._camera.position = endPosition;
        this._camera._adjustOrthographicFrustum(true);
        */

        // api level

        this._camera.setView({
            destination: endPosition,
            orientation: new Cesium.HeadingPitchRoll(this._heading, 0, 0),
            endTransform : Cesium.Matrix4.IDENTITY
        });

        // initialize

        this._direction = DIRECTION_NONE;
        this._steer = STEER_NONE;
    };

    return _;
})();