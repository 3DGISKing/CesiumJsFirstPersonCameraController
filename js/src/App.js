CesiumFPS.App = (function () {
    var viewer = null;
    var cesiumFPSCameraController = null;

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

        var tileset = scene.primitives.add(
            new Cesium.Cesium3DTileset({
                url: Cesium.IonResource.fromAssetId(6074)
            })
        );

        viewer.camera.setView({
            destination: new Cesium.Cartesian3(1216403.8845586285, -4736357.493351395, 4081299.715698949),
            orientation: new Cesium.HeadingPitchRoll(4.2892217081808806, -0.4799070147502502, 6.279789177843313),
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