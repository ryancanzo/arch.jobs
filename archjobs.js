var lat = "38.8951"; 
var lng = "-77.0364";
var zoom = 5;
        
// Loading icon displays if page takes longer than 5 seconds to load
setTimeout(function(){
            $('.initial-load-spinner').fadeIn( 1000 );
}, 5000);
    

    // mobile links double click fix
    $(".title").on("touchend", function(event) {
        window.location.href = $(this).attr("href");
    });

    mapboxgl.accessToken = 'pk.eyJ1IjoicnlhbmNhbnpvIiwiYSI6IjNlNGRhZjQwNmE3YjI5ZGUwNjNjMTBkMzNjN2FjMDkzIn0.4KhPdcnlsTXe3P3GUIiGWg';
    var map = new mapboxgl.Map({
            container: 'map',
            style: 'mapbox://styles/ryancanzo/cjdks4rc700s02rpdpk4aq4y2',
            center: [lng, lat],
            maxZoom: 15,
            minZoom: 1,
            zoom: zoom
        });
    
    // Create empty array for filtering
    var jobsearch = [];
    
    // Initiate geocoder location search
    var geocoder = new MapboxGeocoder({
        accessToken: mapboxgl.accessToken,
        placeholder: 'Location'
    });
    
    // Listen for change of input to record location searches
    $("#geocoder").change(function() {
            var locVal = $("#geocoder").find("input").val();
            ga('send', 'event', 'Location Search', locVal );
    });
        
    document.getElementById('geocoder').appendChild(geocoder.onAdd(map));    

    // Create a popup, but don't add it to the map yet.
    var popup = new mapboxgl.Popup({
        closeButton: false,
        offset: 7
    });
    
    var filterEl = document.getElementById('feature-filter');
    var listingEl = document.getElementById('featured-listings');

    function renderListings(features) {
        // Clear any existing listings
        listingEl.innerHTML = '';
        // Create html elements for listings
        if (features.length) {
            features.forEach(function(feature) {
                var prop = feature.properties;
                $(listingEl).append('<div class="job '+ prop.status +'"><div class="jimg-container"><span class="helper"></span></div><div class="jtext"><a target="_blank" onclick="ga(\'send\', \'event\', \'External Link Click\', \''+ prop.href +'\');" class="job-link title" id="' + prop.post + '" href="'+ prop.href +'"><div class="role listing-text">'+ prop.role +'</div><div class="company listing-text">'+ prop.company +'</div></a><div class="source">'+ prop.source +'</div></div></div>');
                
                //On mobile, remove marker popup on hover or else mobile browsers will require two clicks to open links
                if ($(window).width() > 768) {
                    // Add popup on hover
                    $('#' + prop.post ).mouseover(function() {
                        popup.setLngLat(feature.geometry.coordinates)
                            .setHTML('<a href="' + feature.properties.href + '" ><div>' + feature.properties.role + '<div><div><b>' + feature.properties.company + '</b><div></a>')
                            .addTo(map);
                    });
                    //Remove onmouseout
                    $('#' + prop.post ).mouseout(function() {
                        popup.remove();
                    });
                }
            });
            
            // Put featured jobs to the top of the list
            // $('#featured-listings').find('.standard').remove().appendTo('#featured-listings');
            

        } else {
            var searchvalue = $('#feature-filter').val(); 
            if($('#feature-filter').hasClass('searchactive')){
                $(listingEl).append('<div class="empty">There are no jobs listed for <span style="font-weight:700;color:#464646;">' + searchvalue + '</span> in the current location</div><div class="job"><span style="text-decoration:underline;">arch.jobs</span> is a search engine for architecture jobs. Click below to check elsewhere in the world</div><div href="#" id="find-jobs" class="button">Find Jobs</div>');            
            } else {
                $(listingEl).append('<div class="empty">There are no jobs listed in the current location</div><div class="job"><span style="text-decoration:underline;">arch.jobs</span> is a search engine for architecture jobs. Click below to check elsewhere in the world</div><div href="#" id="find-jobs" class="button">Find Jobs</div>');
            }
            $('.button').on('click', function(){
              map.flyTo({center: [lng,28], zoom: 1});
            });
        }
    }

    
    function normalize(string) {
        return string.trim().toLowerCase();
    }

    function getUniqueFeatures(array, comparatorProperty) {
        
        var existingFeatureKeys = {};
        // Because features come from tiled vector data, feature geometries may be split
        // or duplicated across tile boundaries and, as a result, features may appear
        // multiple times in query results.
        var uniqueFeatures = array.filter(function(el) {
            if (existingFeatureKeys[el.properties[comparatorProperty]]) {
                return false;
            } else {
                existingFeatureKeys[el.properties[comparatorProperty]] = true;
                return true;
            }
        });

        return uniqueFeatures;
        
    }

    map.on('load', function() {
		fetch("/jobs.geojson").then(function(response){
            return response.json(); 
        }).then(function(json){
            // Set the params variable to the json response
            var jobData = json;
			// Add layer to map
			map.addLayer({
				"id": "jobs",
				"type": "symbol",
				"interactive": true,
				"source": {
					type: "geojson",
					data: jobData
				},
				"layout": {
					"icon-image": "circle-4c72ff",
					"icon-padding": 0,
					"icon-allow-overlap": true
				}
			});            

			function fadeListings(){
				$('#featured-listings').fadeOut( 200 );
				$('#intro').fadeOut( 200 );
				setTimeout(function(){
					$('#content').scrollTop(0);
				}, 200);
			}

			// Fade out listings when pan/zoom starts to make transitions smoother and avoid jitter 
			map.on('dragstart', function(){
				fadeListings();
			}); 

			map.on('zoomstart', function(){
				fadeListings();
			});

			// Find listings in current area when pan/zoom ends and fade listings back in
			map.on('moveend', function() {
				var features = map.queryRenderedFeatures({layers:['jobs']});
				if ($("#feature-filter").val()) {
					map.setFilter('jobs', ['has', 'role']);
					var uniqueFeatures = getUniqueFeatures(features, "role");
					ga('send', 'event', 'UI', 'Map Interaction');
					jobsearch = uniqueFeatures;
					searchFunction();
				} else if (features) {
					var uniqueFeatures = getUniqueFeatures(features, "role");
					// Populate list for featured jobs category.
					renderListings(features);
					$('#intro').fadeIn( 200 );
					$('#featured-listings').fadeIn( 200 );
					ga('send', 'event', 'UI', 'Map Interaction');
					jobsearch = uniqueFeatures;
				}

			});

			map.on('mousemove', 'jobs', function(e) {
				// Change the cursor style as a UI indicator.
				map.getCanvas().style.cursor = 'pointer';

				// Populate the popup and set its coordinates based on the feature.
				var feature = e.features[0];
				popup.setLngLat(feature.geometry.coordinates)
					.setHTML('<div>' + feature.properties.role + '<div><div><b>' + feature.properties.company + '</b><div>')
					.addTo(map);
			});

			map.on('mouseleave', 'jobs', function() {
				map.getCanvas().style.cursor = '';
				popup.remove();
			});

			$( "#feature-filter" ).change(function() {
				if (!$(this).val().length == 0) {
					$("#right-x").css('display','block');
				} else {
					$("#right-x").css('display','none');
				}
			});

			// Make feature markers clickable
			map.on('click', function(e) {
				var features = map.queryRenderedFeatures(e.point, {
					layers: ['jobs'] // replace this with the name of the layer
				});
				if (!features.length) {
					return;
				}
				var feature = features[0];
				window.open(feature.properties.href,'_blank');
				ga('send', 'event', 'External Link Click (Map Popup)', feature.properties.href);
			});

			// Create variable to check if user is dragging (in order to fix double click on mobile issue later)
			// The below caused issues with dragging sticking on mobile
			/*var dragging = false;

			$("body").on("touchmove", function(){
				dragging = true;
			});

			$("body").on("touchstart", function(){
				dragging = false;
			});*/

			// List rendered features 0.7s after map load 
			setTimeout(function(){
				var features = map.queryRenderedFeatures({layers:['jobs']});
				$('#featured-listings').fadeTo( 400 , 1 );;
				renderListings(features);
				$('#spinner').removeClass( 'initial-load-spinner' );
				$('#spinner').fadeOut( 400 );
				// Fix double click issue for links added to the page after intial load on mobile safari with content
				$('.job-link').on("touchend", function(){
						if (dragging)
							return;

							var link = $(this).attr('href');
							window.open(link,'_blank');
				});
				// Send job features to array for filtering
				var uniqueFeatures = getUniqueFeatures(features, "role");
				jobsearch = uniqueFeatures;
				console.log(jobsearch.length);
			}, 700);

			function searchRender(){
				if (map.isSourceLoaded('jobs') == true && $('#featured-listings').hasClass('search-loading')){
					//map.setLayoutProperty('jobs', 'visibility', 'visible');
					$('#featured-listings').removeClass('search-loading');
					setTimeout(function(){
						var features = map.queryRenderedFeatures({layers:['jobs']});
						renderListings(features);
						$('#featured-listings').fadeIn();
						$('#spinner').fadeOut( 200 );
						$('#spinner-div').delay( 200 ).fadeOut( 1 );
						if ($('#feature-filter').hasClass('searchactive')) {
							$( ".aquamarine" ).css('transition','background-color .4s ease').css('background-color','aquamarine');
						} else {
							$( ".aquamarine" ).css('transition','background-color .4s ease').css('background-color','#dedede');
						};
					}, 350);
				}
			}

			/* Seacrh filtering _________________________________ */
			filterEl.addEventListener('keyup', function(e) {
				if(e.which == 13){
					searchFunction();
					$( ".aquamarine" ).css('transition','background-color .4s ease').css('background-color','aquamarine');
				}
			});

			function searchFunction() {
				//fade out
				fadeListings();
				setTimeout(function(){
					// Remove any existing searches
					map.setFilter('jobs', ['has', 'role']);

					var searchVal = $("#feature-filter").val();
					ga('send', 'event', 'Search', searchVal);

					$( "#feature-filter" ).addClass('searchactive');

					var value = normalize(searchVal);

					// Filter visible features that don't match the input value.
					var filtered = jobsearch.filter(function(feature) {
						var role = normalize(feature.properties.role);
						var company = normalize(feature.properties.company);
						return role.indexOf(value) > -1 || company.indexOf(value) > -1;
					});

					// Populate the sidebar with filtered results
					renderListings(filtered);

					// Set the filter to populate features into the layer.
					map.setFilter('jobs', ['match', ['get', 'role'], filtered.map(function(feature) {
						return feature.properties.role;
					}), true, false]);

					$('#intro').fadeIn( 200 );
					$('#featured-listings').fadeIn( 200 );
				}, 500);
			}

			/*______________*/

			$("#right-x").click(function() {
				map.setFilter('jobs', ['has', 'role']);
				$( "#feature-filter" ).val("");
				$( "#feature-filter" ).removeClass('searchactive');
				$(this).css('display','none');
				$('#spinner-div').css('display','block');
				$('#spinner').delay( 800 ).fadeIn( 400 );
				$('#featured-listings').fadeOut( 200 ).addClass('search-loading');
				map.getSource('jobs').setData('arch.jobs/jobs.geojson');
				$( ".aquamarine" ).css('transition','background-color .4s ease').css('background-color','#dedede');
				map.on("data", searchRender);
			});
        })
    });