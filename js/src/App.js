CesiumFPS.App = (function () {
    var viewer = null;
    var cesiumFPSCameraController = null;

    var endUserOptions = Cesium.queryToObject(window.location.search.substring(1));

    function start() {
        create3DMap();
        initInterface();
        connectEventHandlers();
    }

    function create3DMap() {
        // For more information on Cesium World Terrain, see https://cesium.com/content/cesiumworldterrain

        viewer = new Cesium.Viewer('cesiumContainer', {
            terrainProvider: Cesium.createWorldTerrain()
        });

        var scene = viewer.scene;

        if(Cesium.defined(endUserOptions.terrain)) {
            var tileset = scene.primitives.add(
                new Cesium.Cesium3DTileset({
                    url: endUserOptions.terrain
                })
            );
        }

        var heading = 0;
        var pitch = 0;
        var roll = 0;

        var lat = 0;
        var long = 0;
        var altitude = 1000;

        if(Cesium.defined(endUserOptions.lat))
            lat = parseFloat(endUserOptions.lat);

        if(Cesium.defined(endUserOptions.long))
            long = parseFloat(endUserOptions.long);

        if(Cesium.defined(endUserOptions.heading))
            heading = parseFloat(endUserOptions.heading);

        viewer.camera.setView({
            destination: new Cesium.Cartesian3.fromDegrees(long, lat, altitude),
            orientation: new Cesium.HeadingPitchRoll(Cesium.Math.toRadians(heading),
                                                     Cesium.Math.toRadians(pitch),
                                                     Cesium.Math.toRadians(roll)),
            endTransform : Cesium.Matrix4.IDENTITY
        });

        cesiumFPSCameraController = new CesiumFPS.CesiumFPSCameraController(viewer);
    }

    // event handlers

    function connectEventHandlers() {
        $('#enter_fps_mode_button').on('click', function(event){
            if (cesiumFPSCameraController.enable()) {
                $('#enter_fps_mode_button').hide();
                $('#exit_fps_mode_button').show();
            }
            else {
                alert("failed to enter FPS mode");
            }
        });

        $('#exit_fps_mode_button').on('click', function(event){
            cesiumFPSCameraController.disable();

            $('#enter_fps_mode_button').show();
            $('#exit_fps_mode_button').hide();
        });
    }

    function initInterface() {
        $('#enter_fps_mode_button').show();
        $('#exit_fps_mode_button').hide();
    }

    return {
        start: start
    }

})();  // App entry point (singleton)