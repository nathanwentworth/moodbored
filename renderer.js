// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.
const moodbored = 'moodbored';
const {dialog} = require('electron').remote;

// requires
const sizeOf = require('image-size');
const fs = require('fs');

// directory variables
let rootDirectory = './mood';
let currentPath = rootDirectory;

// temporary element storage
let imageElements = [];

// container elements
let mainContainer;
let leftSide;
let rightSide;
let folderView;
let imageView;

// option/input elements
let optionsButton;
let optionsMenu;
let directoryInputSubmit;

let columnOption = {
  // ctrl, label
}

let gutterOption = {
  // ctrl, label
}

let backgroundOption = {
  // ctrl, label
}

let userStylesOption;

let hideOptionsButton;

// global options
let options = {
  columns: 3,
  gutter: 6,
  background: '#f1f2f3',
  userStyles: ''
};
let lastDirectory = currentPath;

// other elements
let title;

// this stores the directory structure for both
// caching access, and client-side access
let leaves = [];

function Init() {
  console.log(options);
  Load();
  console.log(options);


  mainContainer = document.getElementById('main');
  leftSide = document.getElementById('left');
  rightSide = document.getElementById('right');
  folderView = document.getElementById('folders');
  imageView = document.getElementById('images');
  title = document.getElementsByTagName('title')[0];
  userStylesElem = document.getElementById('user-styles');

  directoryInputSubmit = document.getElementById('directoryInputSubmit');

  directoryInputSubmit.addEventListener('click', function() {
    OpenFolder();
  });

  hideOptionsButton = document.getElementById('hide-options-button');
  hideOptionsButton.addEventListener('click', function () {
    ToggleSection(leftSide);
    ToggleImageContainerSize();
  });


  window.addEventListener('keydown', function (e) {
    if (e.keyCode == 79) {
      OpenFolder();
    }
  })

}

function InitOptionControllers() {
  columnOption.ctrl = document.getElementById('image-width-ctrl');
  columnOption.label = document.getElementById('image-width-label');
  columnOption.label.innerText = options.columns;
  columnOption.ctrl.value = options.columns;
  columnOption.ctrl.addEventListener('input', function() {
    options.columns = columnOption.ctrl.value;
    columnOption.label.innerText = columnOption.ctrl.value;
    if (imageElements.length > 0) {
      ResizeImages();
    }
    Save();
  });

  gutterOption.ctrl = document.getElementById('gutter-width-ctrl');
  gutterOption.label = document.getElementById('gutter-width-label');
  gutterOption.label.innerText = options.gutter;
  gutterOption.ctrl.value = options.gutter;
  gutterOption.ctrl.addEventListener('input', function() {
    options.gutter = gutterOption.ctrl.value;
    gutterOption.label.innerText = gutterOption.ctrl.value;
    if (imageElements.length > 0) {
      ResizeImages();
    }
    Save();
  });

  backgroundOption.ctrl = document.getElementById('background-ctrl');
  backgroundOption.label = document.getElementById('background-label');
  backgroundOption.label.innerText = options.background;
  backgroundOption.ctrl.value = options.background;
  mainContainer.style.backgroundColor = options.background;
  backgroundOption.ctrl.addEventListener('input', function() {
    options.background = backgroundOption.ctrl.value;
    backgroundOption.label.innerText = backgroundOption.ctrl.value;
    mainContainer.style.backgroundColor = options.background;
    Save();
  });

  userStylesOption = document.getElementById('user-styles-ctrl');
  userStylesOption.value = options.userStyles;
  userStylesElem.innerText = options.userStyles;
  userStylesOption.addEventListener('input', function() {
    options.userStyles = userStylesOption.value;
    console.log(userStylesOption.value);
    userStylesElem.innerText = options.userStyles;
    Save();
  });

}

function OpenFolder() {
  dialog.showOpenDialog({properties: ["openDirectory"]}, (folder) => {
    if (folder === undefined) {
      console.log("no file selected");
      return;
    } else {
      console.log(folder);
      let _root = folder[0];
      leaves = [];
      ClearChildren(folderView);
      GetDirectories(_root);
      LoadDirectory(_root, true);
      CreateFolderView();
    }
  })
}

function Load() {
  _options = localStorage.getItem('options');
  if (_options != null) {
    options = JSON.parse(_options);
    console.log("successfully loaded options");
  } else {
    console.log("No options saved in local storage, going with defaults");
  }
}

function Save() {
  localStorage.setItem('options', JSON.stringify(options));
  console.log('saved options');
}

// on load, run the init and the loadfiles functions
window.addEventListener('load', function () {
  console.log('~~~~~~~~~ initial load ~~~~~~~~~');
  Init();
  InitOptionControllers();
  let loadedPath = localStorage.getItem('lastDirectory');
  rootDirectory = localStorage.getItem('rootDirectory');
  console.log('root is ' + rootDirectory);

  GetDirectories(rootDirectory);
  CreateFolderView();

  if (loadedPath != null) {
    LoadDirectory(loadedPath);
  } else {
    LoadDirectory(rootDirectory);
  }
});

function GetDirectories(dirPath) {
  let dir = fs.readdirSync(dirPath);
  if (dir != undefined && dir.length > 0) {
    for (let i = 0; i < dir.length; i++) {
      let file = dir[i];
      let notLeaf = false;

      let stat = fs.lstatSync(dirPath + '//' + file);
      if (!stat.isDirectory()) {
        if (i === dir.length - 1 && !notLeaf) {
          leaves.push(dirPath);
          // console.log(leaves[leaves.length - 1]);
          // because it reached the end of the loop and there's no directories,
          // it must be full of images
          console.log(dirPath + " is a leaf");
          // CreateFolderElement(dirPath);
        }
      } else {
        let totalPath = dirPath + '/' + file;
        // because there's a directory, it cannot be an end folder
        notLeaf = true;
        // starts the function again in the child directory it found
        GetDirectories(totalPath);
      }
    }
  }

}

function CreateFolderView() {
  ClearChildren(folderView);
  leaves.sort();
  if (leaves.length > 1) {
    for (let leaf of leaves) {
      // console.log(leaf);
      CreateFolderElement(leaf);
    }
  }
}

function CreateFolderElement(totalPath) {
  let sp = document.createElement('span');
  let spTextContent = totalPath.replace(rootDirectory + "/", "");
  spTextContent = spTextContent.replace("/", " / ");
  let spText = document.createTextNode(spTextContent);
  sp.appendChild(spText);

  sp.addEventListener('click', function() {
    LoadDirectory(totalPath);
  });

  folderView.appendChild(sp);
}

function LoadDirectory(dirPath, newRoot) {
  if (newRoot) {
    rootDirectory = dirPath;
    localStorage.setItem('rootDirectory', rootDirectory);
    console.log('new root: ' + rootDirectory);
    leaves = [];
    GetDirectories(dirPath);
  }

  console.log('loading ' + dirPath);
  title.innerText = moodbored + " - " + dirPath;

  if (dirPath != currentPath) {
    currentPath = dirPath;
    ClearChildren(imageView);
    imageElements = [];

    lastDirectory = currentPath;
    localStorage.setItem('lastDirectory', lastDirectory);
    LoadImages(currentPath);
  }

  function LoadImages(_path) {
    fs.readdir(_path, (err, dir) => {
      if (dir.length > 0) {
        for (let file of dir) {
          fs.lstat(_path + '//' + file, function (err, stats) {
            if (err) {
              return console.error(file + ': ' + err);
            }

            if (!stats.isDirectory() &&
                file.match(/.(jpg|png|gif|jpeg|bmp|webp|svg)/)
                )
            {
              CreateImage(_path, file);
            }
          })
        }
      } else {
        console.log(dir + ' length is 0!');
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
    ResizeImage(img);
  }
}

function ToggleSection(section) {
  section.classList.toggle('hidden');
}

function ToggleImageContainerSize() {
  rightSide.classList.toggle('expand');
}

function ResizeImage(img) {
  img.style.width = "calc(100% / " + options.columns + " - " + (options.gutter * 2) + "px)";
  img.style.margin = options.gutter + "px";
}

function ClearChildren(parent) {
  console.log('clearing all children elements of ' + parent.id);
  while (parent.firstChild) {
    parent.removeChild(parent.firstChild);
  }
  console.log('done clearing elements of ' + parent.id);
}



