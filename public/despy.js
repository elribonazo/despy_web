zip.workerScriptsPath = "/zip/";
jQuery(document).ready(function(){
	var songs = [];
	var socket = io.connect(window.location.hostname+":"+location.port);
	var blobs = []; 

	/*
	 * Restart Despy or cancell any download
	 */
	jQuery("#restart").on("click",function(e){
		window.location.reload();
	});
	
	
	/*
	 * Download files that we recently searched
	 */
	jQuery(document).on("click",".todownload",function(e){
		
		if(jQuery("#form_container").hasClass("hidden")){
			jQuery('.top-right').notify({
			    message: { text: "You are currently downloading, to cancel click the refresh button or wait." },
			    type: "info",
				closable: false
			  }).show();
		}else{
			var spuri = jQuery(this).attr("data-spuri");
			var sptype = jQuery(this).attr("data-sptype");
			socket.emit('getsong', {uri:spuri, type:sptype});
		}

		e.preventDefault(); 
	});
	
	/*
	 * Search Files or Download playlist
	 */
	jQuery("#busqueda_form").on("submit",function(e){
		e.preventDefault();
		var tipo = jQuery('input[name=options]:checked', '#busqueda_form').attr("id");
		if(jQuery("#busqueda").val().length<=0){
			jQuery('.top-right').notify({
			    message: { text: "You must enter a search before clicking the send button." },
			    type: "info",
				closable: false
			  }).show();
			return false;
		}
		if(tipo == "playlist"){
			socket.emit('getsong', {uri:jQuery("#busqueda").val(), type:"playlist"});
		}else{
			socket.emit("busqueda",{query: jQuery("#busqueda").val(), busquedatype:tipo});

		}

	});	
	
	jQuery(document).on("click", ".gettracks", function(e){
		
		var album_id = jQuery(this).attr("data-album");
		if(typeof album_id === undefined || album_id === "") return false;
		
		socket.emit("getalbumtracks",{album: album_id});
		
		e.preventDefault();
	});

	/*
	 * tdownloaded update
	 */
	socket.on("tdownloaded", function(data){
		jQuery("#totaldownloaded").html(getReadableFileSizeString(data.total) + " Total");
	});
	
	/*
	 * uonline update
	 */
	socket.on("uonline", function(data){
		jQuery("#onlineusers").html(data.total + " Online");
	});
	
	/*
	 * New Error
	 */
	socket.on("newerror",function(data){
		jQuery('.top-right').notify({
		    message: { text: data.error },
		    type: "danger",
			closable: false
		  }).show();
	});
	
	socket.on("debugbw", function(data){
		console.log(jQuery.parseJSON(data.info));
	});

	socket.on("albumtracks", function(data){
		
		console.log("#albumcont" + data.album);
		console.log(data.content[0].tracks)
		

			var tracks = data.content[0].tracks;
		
			var out = '<ul class="list-group" style="width:100%;">';
			for(i in tracks){
				console.log(tracks[i]);
				out += '<li class="list-group-item text-left">';
				
				out += '<a href="#" class="todownload" data-sptype="track" data-spuri="' + tracks[i].uri + '">';
				out += '<span class="glyphicon glyphicon-music"></span> ';
				out += tracks[i].track_number + " - " + tracks[i].name;
				out += '</a>';
				out += '</li>';
				
			}
			out += '</ul>';
			
			jQuery("#albumcont" + data.album).html(out);
		
		
		
		
		

		
		
	});
	/*
	 * New Search
	 */
	socket.on("busqueda_result",function(data){

		var items = data.content;
		var out = '';
		
		var tipo = data.busquedatype;
		
		if(tipo == "artist"){
			console.log(data);
			for(index in items){
				var artist = items[index];
				if(index%3==0 && index>0) { out += '</div>'; }
				if(index%3==0) { out += '<div class="row">'; }
				
				if(artist.images[0]){
					out += '<div class="col-xs-4">';
					out += '<a href="#" class="todownload thumbnail" data-sptype="artist" data-spuri="' + artist.uri + '" rel="tooltip" data-toggle="tooltip" data-placement="right" title="' + artist.name + '">';
					out += '<img src="' + artist.images[0].url + '"/>';
					out += '</a>';
					out += '</div>';
				}else{
					out += '<div class="col-xs-4">';
					out += '<a href="#" class="todownload thumbnail" data-sptype="artist" data-spuri="' + artist.uri + '" rel="tooltip" data-toggle="tooltip" data-placement="right" title="' + artist.name + '">';
					out += '<img src="spotify_logo.png"/>';
					out += '</a>';
					out += '</div>';
				}
				
			}
		}else if(tipo == "album"){
			var albums = [];
			var i = 0;
			for(index in items){
				var album = items[index];

				if(!albums[album.name]){
					
					if(i%3==0 && i>0) { out += '</div>'; }
					if(i%3==0) { out += '<div class="row">'; }
					
					albums[album.name] = true;
				
					if(album.images[0]){
						out += '<div class="col-xs-12">';
						
						out += '<div class="row">';
						
						out += '<div class="col-xs-4 col-sm-4" style="margin-top:0px;padding-top:0px;">';
						out += '<a class="btn btn-info gettracks" style="width:100%;padding: 8px 2px;" data-album="' + album.id + '" data-todiv="#cont' + album.id + '"><span class="glyphicon glyphicon-search"></span> Tracks</a>';

						out += '<a href="#" class="thumbnail todownload " data-sptype="artist" data-spuri="' + album.uri + '" style="margin-bottom:0px;" rel="tooltip" data-toggle="tooltip" data-placement="right" title="' + album.name + '">';
						out += '<img src="' + album.images[0].url + '"/>';
						out += '</a>';
						out += '<a class="btn btn-info todownload " style="width:100%;margin-bottom:20px;padding: 8px 2px;" data-sptype="artist" data-spuri="' + album.uri + '" style="width:100%;"><span class="glyphicon glyphicon-download"></span> Download</a>';

						out += '</div>';
						
						out += '<div class="col-xs-8 col-sm-8">';

						out += '<div id="albumcont' + album.id + '"></div>';
						out += '</div>';
						
						
						
						out += '</div>';
						
						out += '</div>';
						

					}else{
						out += '<div class="col-xs-12 col-sm-2">';
						out += '<a href="#" class="todownload thumbnail" data-sptype="artist" data-spuri="' + album.uri + '" rel="tooltip" data-toggle="tooltip" data-placement="right" title="' + album.name + '">';
						out += '<img src="spotify_logo.png"/>';
						out += '</a>';
						out += '</div>';
					}
					++i;
				}
				
			}
		}else if(tipo == "track"){
			var tracks = [];
			for(item in items){
				var artist = items[item].artists[0];
				var track = {};
				track.name = items[item].name;
				track.uri = items[item].uri;
				
				if(!tracks[track.uri]){
					tracks[track.uri] = true;
					out += '<div class="col-xs-4">';
					out += '<a href="#" class="todownload" data-sptype="track" data-spuri="' + track.uri + '">' + track.name + ' - ' + artist.name +' </a>';
					out += '</div>';
				}
				
			}
		}

		if(items.length <= 0) {
			jQuery('.top-right').notify({
				message: { text: "Nothing found :(" },
				type: "info",
				closable: false
			}).show();
		}
		jQuery('body').tooltip({
			selector: '[rel=tooltip]'
		});
		jQuery("#result").html(out);
	});

	

	
	/*
	 * Started Download
	 */
	socket.on("start", function(){

		jQuery("#form_container").addClass("hidden");
		jQuery("#refresh_container").removeClass("hidden");

	});
	
	socket.on("speedreset",function(){
		pdownload = 0;
		adownload = 0;
		download_speed = 0;
		speed_array = [];
	});

	var myVar=false;
	
	var pdownload = 0;
	var adownload = 0;
	var download_speed = 0;
	var speed_array = [];
	var media = 0;


	/*
	 * Status update
	 */
	socket.on("status", function(data){
		
		if(data.place){
			if(data.size && data.num && data.p){
				
				var  progreso = data.p;
				
				var inicio = progreso.inicio;
				var fin = progreso.fin;
				var porcentaje = (inicio*100) / fin;
				
				if(jQuery("#proceso").hasClass("hidden") && porcentaje>0)  {
					jQuery("#proceso").removeClass("hidden");
				}
				
				

				jQuery("#downloadify").html("Downloading " + data.trackname + "<br> " + getReadableFileSizeString(data.status));
				
				
				jQuery("#elemento_progreso").css("width",porcentaje.toFixed(2) + "%");
				jQuery("#elemento_progreso").html(inicio + " of " + fin);

			}else{
				jQuery("#downloadify").html("Downloading " + data.status);
			}
		}else{
			jQuery("#status").append("<br>"+data.status + "<br>");	
			var wtf    = jQuery('#status');
			var height = wtf[0].scrollHeight;
			wtf.scrollTop(height);
		}
	});

	/*
	 * Remove Blobs / Process finished
	 */
	socket.on("remove_blobs", function(data){

		
		
		window.cantidad = blobs.length;
		if(blobs.length == 0) {
			jQuery('.top-right').notify({
			    message: { text: 'No hay canciones por descargar :(' },
			    type: "danger",
				closable: false
			  }).show();

			jQuery("#form_container").removeClass("hidden");
			jQuery("#refresh_container").addClass("hidden");
			jQuery("#downloadify").html("");
			return false;
		}
		
		model.setCreationMethod("Blob");
		
		var ad = 0;
		var tot = 0;
		
		model.addFiles(blobs, 
		   function() {
			
		}, function(file) {
	
			++ad;
			
		}, function(current, total) {
			
			
			if(current == total) ++tot;
			jQuery("#downloadify").html("Compressing " + tot + " of " + window.cantidad + " " + getReadableFileSizeString(current) + " of " + getReadableFileSizeString(total));
			
			
			
		}, function() {
			model.getBlobURL(function(url) {
				
				var link = "";
				link = '<a href="' + url + '" download="' + data.filename + '">' + data.filename + '&nbsp;&nbsp;<span class="glyphicon glyphicon-download"></span></a><br>';

				jQuery("#new_zip").append(link);
				jQuery("#new_zip").removeClass("hidden");
				
				jQuery("#form_container").removeClass("hidden");
				jQuery("#refresh_container").addClass("hidden");
				jQuery("#proceso").addClass("hidden");
				jQuery("#downloadify").html("Start downloading something first");
			});
		});

		
		blobs = [];
	});

	/*
	 * New Blob Recieved
	 */
	socket.on("blob", function(data){
		
		
		var blob = new Blob([data.status]); // pass a useful mime type here
		var lent = blobs.length;
		var filename= data.filename.split('/').pop();
		blobs.push({name:filename, data: blob });
		var url = URL.createObjectURL(blob);
		var link = "";
		link += '<a href="' + url + '" download="' + data.filename +'">' + filename +'</a>';
		jQuery("#status").append("<br>"+link + "<br>");	
		var wtf    = jQuery('#status');
		var height = wtf[0].scrollHeight;
		wtf.scrollTop(height);
		
		socket.emit("next_download", {
			next_socket : data.next_socket
		});

	});
});
