require(["node_modules/papaparse/papaparse.min.js", "node_modules/jszip/dist/jszip.js"], 
  function(Papa, jszip) {
    window.Papa = Papa;
    window.JSZip = jszip;
  }
);

const csvConfig = {
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

const COL_HEADERS_REGEX = /var colHeaders = (\[[\s\S]+?\]);/

const PROGRESS_BAR = document.getElementById("progress-bar");

document.getElementById("selector").addEventListener("change", async (event) => {
  try {
    let zipForDownload = new JSZip();
    if (event.target.files.value === "") {
      return;
    }

    let htmlFiles = Array.from(event.target.files).filter((file) => {
      return file.webkitRelativePath.endsWith("1.html");
    });
    if (htmlFiles.length === 0) {
      throw new Error("No compatible files- did you select the right folder?");
    }
    let htmlFile = await readUploadedFileAsText(htmlFiles[0]);
    let arrayJson = htmlFile.match(COL_HEADERS_REGEX)[1];
    let columnNames = JSON.parse(arrayJson);
    columnNames[0] = "nvivo_id"
    csvConfig.columns = columnNames;

    const dataFiles = Array.from(event.target.files).filter((file) => {
      return file.webkitRelativePath.endsWith("/1/0.js");
    });

    if (dataFiles.length === 0) {
      throw new Error("No compatible files- did you select the right folder?");
    }

    PROGRESS_BAR.style.display = "block;"
    PROGRESS_BAR.max = dataFiles.length;
    for (let myFile of dataFiles) {
      let folderName = myFile.webkitRelativePath.match(folderNameRegex)[1];
      let fileContents = await readUploadedFileAsText(myFile);
      
      fileContents = fileContents.substring(0, fileContents.length - 1);
      
      let data = parse(fileContents)();
      if (!Array.isArray(data) || data.flat().some(element => typeof element !== "string")) {
        throw new Error("File format wrong");
      }
      data.unshift(columnNames);
      let outputString = Papa.unparse(data, csvConfig);
      zipForDownload.file(`${folderName}.csv`, outputString);
      PROGRESS_BAR.value++;
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