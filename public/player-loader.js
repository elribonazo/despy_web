  $(function() { 
	  
      // Setup the player to autoplay the next track
      	  $.ajax({
		  type: "GET",
		  dataType: "xml",
		  url: "playlist.xml",
		  success: function(xml){ 
			  
			  tracklist = xml.getElementsByTagName("file");
			  lista = jQuery("#lista_reproduccion");
			 
			  for(i=0;i<tracklist.length;++i){
				  console.log(tracklist[i].childNodes[0].nodeValue);
				  if(tracklist[i].childNodes[0]){
					 
					var nombre = tracklist[i].childNodes[0].nodeValue;
					nombre = nombre.split("/");
					nombre = nombre[nombre.length -1];

					port = window.port;
					hostname = window.hostname;
					if(hostname == 0){
						hostname = "http://localhost";
					}
					
					var fichero = tracklist[i].childNodes[0].nodeValue;
					fichero = fichero.replace(location.protocol+'//'+location.hostname+(location.port ? ':'+location.port: ''),location.protocol+'//'+location.hostname+(location.port ? ':'+location.port: '') + "/music")
					
			    	var out;
			    	out = '<li><a href="#" data-src="' + fichero + '">' + nombre + '</a></li>';
			   		lista.append(out);
				  }
			  }

			  console.log("done");
			  var a = audiojs.createAll({
			        trackEnded: function() {
			          var next = $('ol li.playing').next();
			          if (!next.length) next = $('ol li').first();
			          next.addClass('playing').siblings().removeClass('playing');
			          audio.load($('a', next).attr('data-src'));
			          audio.play();
			        }
			      });  
			  
	      var audio = a[0];
          first = $('ol a').attr('data-src');
          $('ol li').first().addClass('playing');
          audio.load(first);
          
          
		// Load in a track on click
          $('ol li').click(function(e) {
              
              $(this).addClass('playing').siblings().removeClass('playing');
              audio.load($('a', this).attr('data-src'));
              audio.play();
              e.preventDefault();
            });
            // Keyboard shortcuts
            $(document).keydown(function(e) {
              var unicode = e.charCode ? e.charCode : e.keyCode;
                 // right arrow
              if (unicode == 39) {
                var next = $('li.playing').next();
                if (!next.length) next = $('ol li').first();
                next.click();
                // back arrow
              } else if (unicode == 37) {
                var prev = $('li.playing').prev();
                if (!prev.length) prev = $('ol li').last();
                prev.click();
                // spacebar
              } else if (unicode == 32) {
                audio.playPause();
              }
            });
		   
		  }
		 });
      
      
      
      



    });