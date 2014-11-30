var express = require('express');
var fs = require('fs');
var rmdir = require('rimraf');
var Spotify = require('spotify-web');
var ffmetadata = require("ffmetadata");
var spotify_config = require('./config/spotify.json');
var spotify_buscar = require('spotify');
var puerto = process.env.PORT;
var spotify_username =spotify_config.login;
var spotify_password =spotify_config.password;
var app     = express();
var server  = app.listen(puerto);
var io      = require('socket.io').listen(server);
var shuffleMode = false;
var repeatMode = false;
var debugMemoryUsage = true;
var uris = ['spotify:track:7KKx4INB8LyGUeNXKiqQHK'];
var folderfi = process.argv.slice(3);
var email_destination = folderfi;
var mail = process.argv.slice(3);
folderfi = folderfi;
var currentTrack = [];
var trackList = [];
var xmlplaylist;
var downloadinfo = [];
var totaldownloaded = 0;
var spm3 = require('spotify_m3');

rmdir('downloads/', function(error){
	if(error) throw error;
	fs.mkdirSync(__dirname + "/downloads");
	console.log("Regenerating the downloads folder");
	
});

console.log("Conectado puerto :" + puerto);

if (debugMemoryUsage) {
	setInterval(function () {
		var mem = process.memoryUsage();
		console.log(Math.round(mem.rss/1024/1024)+" MB RSS used | "+Math.round(mem.heapUsed/1024/1024)+" MB heap used | "+Math.round(mem.heapTotal/1024/1024)+" MB heap total | "+Math.round((mem.heapUsed/mem.heapTotal)*100)+"% of heap used");
	}, 50000);
}

function playTrack(spotify,socket,downloadinfo) {

	if(!clients[socket.id]){
		return;
	}

	var st = Date.now();

	if (trackList[socket.id].length === 0) {

		spotify.disconnect();
		var zipfilename = "despy";

		if(downloadinfo && downloadinfo.tipo){
			var tipo = downloadinfo.tipo;

			if(tipo == "track"){
				zipfilename = downloadinfo.track.name;
			}else if(tipo == "album"){
				zipfilename = downloadinfo.album.name;
			}
		}


		zipfilename += ".zip";
		io.to(socket.id).emit('remove_blobs',{filename:zipfilename});

		rmdir('downloads/' + socket.id , function(error){
			if(error) throw error;
			
			console.log("Removed files");
			
		});
		
		return;
	}


	var uri = trackList[socket.id][currentTrack[socket.id]++];

	if (uri === undefined) {
		if (repeatMode) {
			shuffleMode && shuffle(trackList[socket.id]);
			currentTrack[socket.id] = 0;
		} else {
			trackList[socket.id] = [];
		}
		playTrack(spotify,socket,downloadinfo);
		return;
	}

	spotify.get(uri, function (err, track) {
		if (err) throw err;

		if (!spotify.isTrackAvailable(track)) {

			trackList[socket.id].splice(trackList[socket.id].indexOf(uri), 1);
			currentTrack[socket.id]--;

			io.to(socket.id).emit("newerror",{
				error:"Unable to play "+track.artist[0].name+' - '+track.name+', track not available', 
				etype:'alert-danger'
			});
			console.log("Unable to play "+track.artist[0].name+' - '+track.name+', track not available');

			playTrack(spotify,socket,downloadinfo);
			return;
		}

		var stream = track.play();
		var _chunks = [];
		var datos = 0;
		var falbum = track.album.name;
		var ftrackname = track.name;

		//io.to(socket.id).emit("debugbw", {info:JSON.stringify(track)});

		
		
		var trackinfo = {};
		trackinfo.artist = track.artist.name;
		trackinfo.album = falbum;
		trackinfo.track = ftrackname;

		falbum = falbum.replace("\/","");
		falbum = falbum.replace(/[^a-zA-Z0-9 -_]/g,'');
		falbum = falbum.replace("(","");
		falbum = falbum.replace(")","");
		falbum = falbum.replace("\/","");
		falbum = falbum.replace(".","");
		falbum = falbum.replace(",","");
		falbum = falbum.replace("/","");

		ftrackname = ftrackname.replace("(","");
		ftrackname = ftrackname.replace(")","");
		ftrackname = ftrackname.replace("\/","");
		trackname = ftrackname.replace(",","");
		trackname = ftrackname.replace("/","");

		var textnum = "";
		textnum += trackname.replace(/[^a-zA-Z0-9 -_]/g,'') + ".mp3 <br>  " +currentTrack[socket.id] + " of " + trackList[socket.id].length + " ";

		var proceso = {};
		proceso.inicio = currentTrack[socket.id];
		proceso.fin = trackList[socket.id].length;

		io.to(socket.id).emit('speedreset');

		stream.on('data', function(chunk) {
			datos += chunk.length;
			_chunks.push(chunk);

			totaldownloaded += chunk.length;
			io.to(socket.id).emit('status', { status:datos, place:"download", size:true, num:textnum, p:proceso, trackname:trackname.replace(/[^a-zA-Z0-9 -_]/g,'') + ".mp3" });
		});


		stream.on("end",function(){

			var tags = {title: trackinfo.track, artist: track.artist[0].name, album: trackinfo.album}
			var fartist = track.artist[0].name;
			var body = Buffer.concat(_chunks);
			
			fs.exists(__dirname + "/downloads/", function(exists) {
				if(!exists){
					fs.mkdirSync(__dirname + "/downloads");
				}
				
				fs.exists(__dirname + "/downloads/" + socket.id, function(exists) {
					if (!exists) {
						fs.mkdirSync(__dirname + "/downloads/" + socket.id);
					}
					
					var fichero_destino = __dirname + "/downloads/" + socket.id + "/" + trackname.replace(/[^a-zA-Z0-9 -_]/g,'') + ".mp3";
					
					
					fs.writeFile(fichero_destino, body, function (err) {
						if (err) throw err;

						var data = {
							artist: tags.artist,
							title: tags.title,
							album: tags.album
						};
						
						if(downloadinfo.tipo == "playlist"){
							data.album = downloadinfo.playlist;
						}

						ffmetadata.write(fichero_destino, data, function(err) {
							if (err) console.error("Error writing metadata" + err);
							
							else{
								
								fs.readFile(fichero_destino, function (err, data) {
									if (err) throw err;

									io.sockets.emit("tdownloaded",{total:totaldownloaded});
									
									io.to(socket.id).emit('blob', { 
										status:data, 
										filename:"/music/" + falbum + '-'+ trackname.replace(/[^a-zA-Z0-9 -_]/g,'') + ".mp3",
										next_socket : socket.id,
									});
									
									

								});

								
							}
						});
						
					});

				});
			});
			
		});
	});
}

app.use(function(req, res, next) {
	var auth;

	if (req.headers.authorization) {
		auth = new Buffer(req.headers.authorization.substring(6), 'base64').toString().split(':');
	}

	if (!auth || auth[0] !== 'despy' || auth[1] !== '2014') {
		// any of the tests failed
		// send an Basic Auth request (HTTP Code: 401 Unauthorized)
		res.statusCode = 401;
		// MyRealmName can be changed to anything, will be prompted to the user
		res.setHeader('WWW-Authenticate', 'Basic realm="BCN Hackaton"');
		// this will displayed in the browser when authorization is cancelled
		res.end('<!DOCTYPE html>' +
				'<html lang="en">' +
				'<head>'+
				'<meta charset="utf-8">'+
				'<title>Despy V5</title>'+
				'<meta name="viewport" content="width=device-width, initial-scale=1">'+
				'<link href="//maxcdn.bootstrapcdn.com/bootstrap/3.2.0/css/bootstrap.min.css" rel="stylesheet">'+
				'<script src="//code.jquery.com/jquery-1.11.0.min.js"></script>'+
				'<script src="//maxcdn.bootstrapcdn.com/bootstrap/3.2.0/js/bootstrap.min.js"></script>'+
				'<script src="/socket.io/socket.io.js"></script>'+
				'</head>'+
				'<body>'+
				'<div class="container-fluid" id="links">' + 
				'<h1>Maybe i dont want you to be here, thanks</h1>' +
				'</div>' +
				'</body></html>'

		);
	} else {
		next();
	}
});



app.get("*",function(req,res){
	res.sendfile(__dirname + '/public'+req.path);
});


var clients = [];
var i = [];
var totalusers = 0;
var spotify_obj = [];
var socket_obj = [];

io.on('connection', function (socket) {

	clients[socket.id] = Spotify;
	++totalusers;
	socket_obj[socket.id] = socket;

	io.to(socket.id).emit("tdownloaded",{total:totaldownloaded});

	io.sockets.emit("uonline",{total:totalusers});

	socket.on('disconnect', function () {
		
		delete clients[socket.id];
		delete uris[socket.id];
		delete trackList[socket.id];
		delete i[socket.id];
		delete currentTrack[socket.id];
		delete downloadinfo[socket.id];
		delete spotify_obj[socket.id];
		delete socket_obj[socket.id];
		
		--totalusers;
		io.sockets.emit("uonline",{total:totalusers});

	});
	
	socket.on("next_download", function(data){
		playTrack(spotify_obj[data.next_socket],socket_obj[data.next_socket],downloadinfo[data.next_socket]);
	});
	
	socket.on("getalbumtracks", function(data){
		
	
		var album_id = data.album;
		
		var album_array = [];
		var newalbum = {};
		newalbum.id = album_id;
		
		album_array.push(newalbum);
		
		spm3.gettracks(album_array, function(err, result){

			io.to(socket.id).emit("albumtracks", {content:result, album: album_id});

		});
	});

	socket.on("busqueda", function(data){
		
		tipo = data.busquedatype;

		
		var search_query = tipo + " (" + data.query + ")";
		
		
			
		spotify_buscar.search({ type: tipo, query: data.query }, function(err, data) {

			if ( err ) {
				io.to(socket.id).emit("busqueda_err",{content:"Error " + err});
				return;
			}
			
			var found = false;
			var elementos = "";

			if(tipo == "artist"){
				if(data.artists){
					if(data.artists.items){
						found = true;
						elementos = data.artists.items;

					}
				}
			}else if(tipo == "album"){
				if(data.albums){
					if(data.albums.items){
						found = true;
						elementos = data.albums.items;
					}
				}
			}else if(tipo == "track"){
				if(data.tracks){
					if(data.tracks.items){
						found =true;
						elementos = data.tracks.items;
					}
				}
			}else if(tipo == "playlist"){
				if(data.playlists){
					if(data.playlists.items){
						found = true;
						elementos = data.playlists.items;
					}
				}
			}



			if(elementos.length>0 && found){
				io.to(socket.id).emit("busqueda_result", {content:elementos, busquedatype:tipo});
			}else{
				io.to(socket.id).emit("newerror",{
					error:"Nothing found for : " + search_query, 
					etype:'alert-danger'
				});
			}
		});
		
	});


	socket.on('getsong', function (data) {


		var spotify_url = data.uri;
		uris[socket.id] = [spotify_url];
		i[socket.id] = -1;
		trackList[socket.id] = [];		
		currentTrack[socket.id] = 0;
		downloadinfo[socket.id] = {};
		

		console.log("Logging in to Spotify as "+spotify_username+"...");
		clients[socket.id].login(spotify_username, spotify_password, function (err, spotify) {

			spotify_obj[socket.id] = spotify;

			console.log("Buscando pistas...");
			uriLoop();

			function uriLoop() {

				i[socket.id]++;
				if (i[socket.id] >= uris[socket.id].length) {
					console.log(trackList[socket.id].length +" track(s) in list");
					io.to(socket.id).emit('start');	
					playTrack(spotify,socket, downloadinfo[socket.id]);
					return;
				}


				try{
					var uri = uris[socket.id][i[socket.id]];
					var type = clients[socket.id].uriType(uri);


					if (type === 'track') {
						spotify.get(uri, function (err, track) {
							if (err) {
								io.to(socket.id).emit("newerror",{error:"The spotify url (" + track + ")  is incorrect.", etype:'alert-danger'});
								return false;
							}
							console.log("Adding track "+track.name+" - "+track.artist[0].name);

							trackList[socket.id].push(uri);


							downloadinfo[socket.id].tipo = type;
							downloadinfo[socket.id].track = track;

							uriLoop();
						});
					} else if (type === 'playlist') {
						spotify.playlist(uri, 0, 1000, function (err, playlist) {
							if (err) {
								io.to(socket.id).emit("newerror",{error:"The spotify url (" + playlist + ")  is incorrect.", etype:'alert-danger'});
								return false;
							}
							console.log("Adding playlist "+playlist.attributes.name);
							if (playlist.length > 0) {
								for (var j = 0; j < playlist.contents.items.length; j++) {
									var uri = playlist.contents.items[j].uri;
									if (clients[socket.id].uriType(uri) === 'track') {
										trackList[socket.id].push(playlist.contents.items[j].uri);
									}
								}

								downloadinfo[socket.id].tipo = type;
								downloadinfo[socket.id].playlist = playlist.attributes.name;
							}
							uriLoop();
						});
					} else if (type === 'album') {
						spotify.get(uri, function (err, album) {
							if (err) {
								io.to(socket.id).emit("newerror",{error:"The spotify url (" + album + ")  is incorrect.", etype:'alert-danger'});
								return false;
							}
							console.log("Adding album "+album.name);

							var tracks = [];

							album.disc.forEach(function (disc) {
								if (!Array.isArray(disc.track)) return;

								for (var j = 0; j < disc.track.length; j++) {
									trackList[socket.id].push(disc.track[j].uri);
								}
							});


							downloadinfo[socket.id].tipo = type;
							downloadinfo[socket.id].album = album;


							uriLoop();
						});
					} else if(type == "artist") {
						var id_artist = uri.replace("spotify:artist:","");
						spotify_buscar.lookup({type:"artist", id: id_artist + "/albums"}, function(err, data){
							if (err) {
								io.to(socket.id).emit("newerror",{error:"The spotify url (" + uri + ") is incorrect.", etype:'alert-danger'});
								return false;
							}
							io.to(socket.id).emit("busqueda_result", {content:data.items, busquedatype:"album"});
						});
					
					} else {
						io.to(socket.id).emit("newerror",{error:"Uknown type " + type, etype:'alert-danger'});
						console.log("Ignoring "+uri+" of type "+type);
						uriLoop();
					}
				} catch (e) {
					if (e.message.indexOf('could not determine') === 0) {
						io.to(socket.id).emit("newerror",{error:"Url format incorrect.", etype:'alert-danger'});
					}else{
						io.to(socket.id).emit("newerror",{error:e.message, etype:'alert-danger'});
					}
					console.log(e.message);
				}
			}
		});
	});
});







