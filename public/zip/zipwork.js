var obj = this;
var model = (function() {
    var zipFileEntry, zipWriter, writer, creationMethod, URL = obj.webkitURL || obj.mozURL || obj.URL;
    return {
        setCreationMethod : function(method) {
            creationMethod = method;
        },
        addFiles : function addFiles(files, oninit, onadd, onprogress, onend) {
            var addIndex = 0;
            function nextFile() {
                var file = files[addIndex];
                onadd(file);
                zipWriter.add(file.name, new zip.BlobReader(file.data), function() {
                    addIndex++;
                    if (addIndex < files.length)
                        nextFile();
                    else
                        onend();
                }, onprogress);
            }
            function createZipWriter() {
                zip.createWriter(writer, function(writer) {
                    zipWriter = writer;
                    oninit();
                    nextFile();
                }, onerror);
            }
            if (zipWriter)
                nextFile();
            else if (creationMethod == "Blob") {
                writer = new zip.BlobWriter();
                createZipWriter();
            }
        },
        getBlobURL : function(callback) {
            zipWriter.close(function(blob) {
                var blobURL = creationMethod == "Blob" ? URL.createObjectURL(blob) : zipFileEntry.toURL();
                callback(blobURL);
                zipWriter = null;
            });
        },
        getBlob : function(callback) {
            zipWriter.close(callback);
        }
    };
})();

