// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.
const moodbored = 'moodbored';

// requires
const sizeOf = require('image-size');
const fs = require('fs');

// directory variables
let rootDirectory = './mood';
let currentPath = rootDirectory;
let directoriesLoaded = false;

// temporary element storage
let imageElements = [];

// container elements
let folderView;
let imageView;

// option/input elements
let optionsButton;
let optionsMenu;
let directoryInput;
let directoryInputSubmit;
let imageWidthController;
let imageWidthLabel;

// global options
let numberOfColumns = 3;
let gutter = 6;

// other elements
let title;

function Init() {
  folderView = document.getElementById('folders');
  imageView = document.getElementById('images');
  title = document.getElementsByTagName('title')[0];

  directoryInput = document.getElementById('directoryInput');
  directoryInput.value = rootDirectory;
  directoryInputSubmit = document.getElementById('directoryInputSubmit');

  optionsButton = document.getElementById('options-button');
  optionsButton.addEventListener('click', function () {
    console.log("toggle options menu");
  });

  imageWidthController = document.getElementById('image-width-ctrl');
  imageWidthLabel = document.getElementById('image-width-label');
  imageWidthLabel.innerText = imageWidthController.value;

  imageWidthController.addEventListener('input', function() {
    numberOfColumns = imageWidthController.value;
    imageWidthLabel.innerText = imageWidthController.value;
    if (imageElements.length > 0) {
      ResizeImages();
    }
    console.log(imageWidthController.value);
  });

  directoryInputSubmit.addEventListener('click', function() {
    LoadImages(directoryInput.value);
  });

  directoryInput.addEventListener('keydown', function (e) {
    if (e.keyCode == 13) {
      let val = directoryInput.value;
      if (val.startsWith("./")) {
        rootDirectory = val;
      } else {
        LoadImages(val);
      }
    }
  })
}


// on load, run the init and the loadfiles functions
window.addEventListener('load', function () {
  Init();
  GetDirectories(rootDirectory);
  LoadImages(rootDirectory);
});

// this stores the directory structure for both
// caching access, and client-side access
let leaves = [];

function GetDirectories(dirPath) {
  fs.readdir(dirPath, (err, dir) => {
    for (let i = 0; i < dir.length; i++) {
      let file = dir[i];
      let notLeaf = false;
      fs.lstat(dirPath + '//' + file, function (err, stats) {
        if (err) {
          return console.error(file + ': ' + err);
        }

        if (!stats.isDirectory()) {
          if (i === dir.length - 1 && !notLeaf) {
            leaves.push(dirPath);
            // because it reached the end of the loop and there's no directories,
            // it must be full of images
            console.log(dirPath + " is a leaf");
            CreateFolderElement(dirPath);
          }
        } else {
          let totalPath = dirPath + '/' + file;
          // because there's a directory, it cannot be an end folder
          notLeaf = true;
          // starts the function again in the child directory it found
          GetDirectories(totalPath);
        }
      })
    }
  })
}

function CreateFolderElement(totalPath) {
  let sp = document.createElement('span');
  let spText = document.createTextNode(totalPath.replace(rootDirectory + "/", ""));
  sp.appendChild(spText);
  sp.addEventListener('click', function() {
    LoadImages(totalPath);
  });
  folderView.appendChild(sp);
}

function LoadImages(dirPath) {
  directoryInput.value = dirPath.replace(rootDirectory, "");
  if (!dirPath.startsWith("./")) {
    dirPath = rootDirectory + "/" + dirPath;
  }
  let extraSlashes = /(\/)+/g;
  dirPath = dirPath.replace(extraSlashes, "/");
  console.log(dirPath);
  title.innerText = moodbored + " - " + dirPath;
  if (dirPath != currentPath) {
    currentPath = dirPath;
    ClearChildren(imageView);
    imageElements = [];

    fs.readdir(dirPath, (err, dir) => {
      let noImages = false;
      for (let i = 0; i < dir.length; i++) {
        let file = dir[i];
        fs.lstat(dirPath + '//' + file, function (err, stats) {
          if (err) {
            return console.error(file + ': ' + err);
          }

          if (!stats.isDirectory()) {
            if (file.match(/.(jpg|png|gif|jpeg|bmp|webp|svg)/)) {
              CreateImage(dirPath, file);
            }
          }
        })
      }
    })
  }

}

function CreateImage(path, file) {
  let img = document.createElement('img');
  let src = path + '/' + file;
  let dim = sizeOf(src);
  img.src = src;
  img.height = dim.height;
  img.width = dim.width;
  ResizeImage(img);
  imageView.appendChild(img);
  img.onload = function () {
    img.classList.add('img-loaded');
  }
  imageElements.push(img);
}

function ResizeImages() {
  for (let img of imageElements) {
    ResizeImage(img, numberOfColumns, gutter);
  }
}

function ResizeImage(img) {
  img.style.width = "calc(100% / " + numberOfColumns + " - " + (gutter * 2) + "px)";
  img.style.margin = gutter + "px";
}

function ClearChildren(parent) {
  console.log('clearing all children elements');
  while (parent.firstChild) {
    parent.removeChild(parent.firstChild);
  }
  console.log('done clearing elements');
}



