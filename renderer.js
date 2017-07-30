// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.
const moodbored = 'moodbored';


const sizeOf = require('image-size');
const fs = require('fs');

let rootDirectory = './mood';
let currentPath = rootDirectory;
let directoriesLoaded = false;

let folderView;
let imageView;

let directoryInput;
let directoryInputSubmit;

let title;

function Init() {
  folderView = document.getElementById('folders');
  imageView = document.getElementById('images');
  title = document.getElementsByTagName('title')[0];

  directoryInput = document.getElementById('directoryInput');
  directoryInput.value = rootDirectory;
  directoryInputSubmit = document.getElementById('directoryInputSubmit');

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
  if (dirPath != currentPath) {
    currentPath = dirPath;
    ClearChildren(imageView);

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
  ResizeImage(img, 3, 6);
  imageView.appendChild(img);
  img.onload = function () {
    img.classList.add('img-loaded');
  }
}

function ResizeImages(numberOfColumns, gutter) {
  let imgs = imageView.getElementsByTagName('img');
  for (let img of imgs) {
    ResizeImage(img, numberOfColumns, gutter);
  }
}

function ResizeImage(img, numberOfColumns, gutter) {
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



