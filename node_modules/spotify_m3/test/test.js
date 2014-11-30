var spm3 = require("../lib/spotify_m3");



spm3.get_album_tracks_by_artist("wegfdhgjhkj", function(err, data){
	if(err) throw err;
	console.log("DATA : ");
	console.log(data.length);
});