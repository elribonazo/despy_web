spotify_m3
==========

Nodejs Module that implements track search and its information

##Usage
```javascript
var spm3 = require("spotify_m3");
```
# Get all the albums and tracks by artist name
```javascript
spm3.get_albums_by_artist("coldplay", function(data){
	console.log(data);
});
```

# Get album tracks by Artist name
```javascript
spm3.get_album_tracks_by_artist("coldplay", function(data){
	console.log(data);
});
```

# Get tracks from a album array
```javascript
var albums_array = [
{id:'spotify_album_id121332'},
{id:'spotify_album_id121333'},
{id:'spotify_album_id121334'}
];


spm3.getalbumstracks(albums_array, function(data){
	console.log(data);
});
```

# Get all the artist array albums
```javascript
var artist_array = [
{id:'spotify_artist_id121332'},
{id:'spotify_artist_id121333'},
{id:'spotify_artist_id121334'}
];

spm3.getalbums(artist_array, function(data){
	console.log(data);
);
```

###More tests in /test/test.js