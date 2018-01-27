/*
  Submits form data and then waits for a response.  Then assign the Audio
  contols src to the response back from the server.
*/

const submitFile = (file) => {
    var formData = new FormData();

    formData.append("file_input", file);

    //This is the actual function that sends a req
    //to the server.
    fetch("/upload", {
        method: "POST",
        body: formData
    })
    .then(response => response.json())
    .catch(error => console.log(error))
    .then(response => {
      /*grab the response's json object and set src of controls to
      audio/name-of-the-audio */
        $("#audio-controls").attr("src", "/audio/" + response.audio)
    });
}

//Simulates a click on for input data on an image
const daisy = () => {
    $("#capture-btn").click();
}

/*
  When the page is loaded, set a callback function for when the form input
  changes.  When it changes, compress file then submit the form data.
*/
$("document").ready(function(){
    $("#capture-btn").change(function(e) {
        //Check that a file is has been loaded
        const file = e.target.files[0];
        if (!file) { return; }

        //Compress the file
        new ImageCompressor(file, {
            quality: .6,
            success(result) {
                //When compressed, submit the file
                submitFile(result);
            },
            error(e) {
                console.log(e.message);
            },
        });
    });
});
