require(["node_modules/papaparse/papaparse.min.js", "node_modules/jszip/dist/jszip.js"], 
  function(Papa, jszip) {
    window.Papa = Papa;
    window.JSZip = jszip;
  }
);

const csvConfig = {
  columns: ["Nvivo ID", "text"],
  dynamicTyping: true,
};

function parse(obj) {
  return eval?.(`"use strict";(${obj})`);
}

const readUploadedFileAsText = (inputFile) => {
  const temporaryFileReader = new FileReader();

  return new Promise((resolve, reject) => {
    temporaryFileReader.onerror = () => {
      temporaryFileReader.abort();
      reject(new DOMException("Problem parsing input file."));
    };

    temporaryFileReader.onload = () => {
      resolve(temporaryFileReader.result);
    };
    temporaryFileReader.readAsText(inputFile);
  });
};

const folderNameRegex = /(?:^.*\/)(.*)(?:\/1\/0.js$)/

document.getElementById("selector").addEventListener("change", async (event) => {
  try {
    let zipForDownload = new JSZip();
    if (event.target.files.value === "") {
      return;
    }
    const dataFiles = Array.from(event.target.files).filter((file) => {
      return file.webkitRelativePath.endsWith("/1/0.js");
    });

    if (dataFiles.length === 0) {
      throw new Error("No compatible files- did you select the right folder?");
    }
    for (let myFile of dataFiles) {
      let folderName = myFile.webkitRelativePath.match(folderNameRegex)[1];
      let fileContents = await readUploadedFileAsText(myFile);
      
      fileContents = fileContents.substring(0, fileContents.length - 1);
      
      let data = parse(fileContents)();
      if (!Array.isArray(data) || data.flat().some(element => typeof element !== "string")) {
        throw new Error("File format wrong");
      }

      let outputString = Papa.unparse(data, csvConfig);
      zipForDownload.file(`${folderName}.csv`, outputString);
    }
    
    let zipBlob = await zipForDownload.generateAsync({type:"blob"})
    let downloadUrl = URL.createObjectURL(zipBlob);
    window.location.replace(downloadUrl);
  }
  catch (ex) {
    alert(ex.message);
    console.error(ex);
  }

});