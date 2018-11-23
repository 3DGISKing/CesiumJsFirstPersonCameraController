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

        var loadingIndicator = document.getElementById('loadingIndicator');

        viewer = new Cesium.Viewer('cesiumContainer', {
            terrainProvider: Cesium.createWorldTerrain()
        });

        var scene = viewer.scene;

         if(Cesium.defined(endUserOptions.terrain)) {
            scene.primitives.add(
                new Cesium.Cesium3DTileset({
                    url: endUserOptions.terrain
                })
            );

            console.log("terran url: " + endUserOptions.terrain);
        }
        else {
           /* scene.primitives.add(
                new Cesium.Cesium3DTileset({
                    url: Cesium.IonResource.fromAssetId(6074)
                })
            );
            */
        }

        var heading = 0;
        var pitch = 0;
        var roll = 0;

        var lat = 0;
        var long = 0;
        var altitude = 1000;

        if(Cesium.defined(endUserOptions.lat)) {
            lat = parseFloat(endUserOptions.lat);
            console.log("lat: " + lat);
        }

        if(Cesium.defined(endUserOptions.long)) {
            long = parseFloat(endUserOptions.long);
            console.log("longi: " + long);
        }

        if(Cesium.defined(endUserOptions.heading)) {
            heading = parseFloat(endUserOptions.heading);
            console.log("heading: " + heading);
        }

        if(Cesium.defined(endUserOptions.lat) && Cesium.defined(endUserOptions.long) && Cesium.defined(endUserOptions.heading)){
            viewer.camera.setView({
                destination: new Cesium.Cartesian3.fromDegrees(long, lat, altitude),
                orientation: new Cesium.HeadingPitchRoll(Cesium.Math.toRadians(heading),
                    Cesium.Math.toRadians(pitch),
                    Cesium.Math.toRadians(roll)),
                endTransform : Cesium.Matrix4.IDENTITY
            });
        }
        else {
            viewer.camera.setView({
                destination: new Cesium.Cartesian3(1216403.8845586285, -4736357.493351395, 4081299.715698949),
                orientation: new Cesium.HeadingPitchRoll(4.2892217081808806, -0.4799070147502502, 6.279789177843313),
                endTransform : Cesium.Matrix4.IDENTITY
            });
        }

        cesiumFPSCameraController = new CesiumFPS.CesiumFPSCameraController(viewer);

        loadingIndicator.style.display = 'none';
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

       /*  Cesium.knockout.track(viewModel2);
        var toolbar = document.getElementById('toolbar');
        Cesium.knockout.applyBindings(viewModel2, toolbar);

        var textDisplay1 = document.createElement('div');
        var textDisplay2 = document.createElement('div');

        textDisplay1.textContent = 'MOVE: W / A / S / D   keyboard keys';
        document.getElementById('toolbar').appendChild(textDisplay1);
        textDisplay2.textContent = 'LOOK: Left click, and move mouse';
        document.getElementById('toolbar').appendChild(textDisplay2);
        */
    }

    return {
        start: start
    }

})();  // App entry point (singleton)