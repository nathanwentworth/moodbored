// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.
const moodbored = 'moodbored';
const {dialog} = require('electron').remote;

// requires
const fs = require('fs');

// directory variables
let rootDirectory = '';
let currentPath = rootDirectory;

// temporary element storage
let imageElements = [];
let imageSrcs = [];
let imgFileTypes = /.(jpg|png|gif|jpeg|bmp|webp|svg)/;

// container elements
let body = document.getElementsByTagName('body')[0];
let mainContainer = document.getElementById('main');
let leftSide = document.getElementById('left');
let rightSide = document.getElementById('right');
let folderView = document.getElementById('folders');
let imageView = document.getElementById('images');

// option/input elements
let optionsMenu = document.getElementById('options-menu');
let openFolderCtrl = document.getElementById('open-folder-ctrl');

let columnOption = {
  ctrl: document.getElementById('image-width-ctrl'),
  label: document.getElementById('image-width-label')
}

let gutterOption = {
  ctrl: document.getElementById('gutter-width-ctrl'),
  label: document.getElementById('gutter-width-label')
}

let dropzone = {
  elem: document.getElementById('image-drop'),
  drop: function (e, altPath) {
    let files = e.dataTransfer.files;
    for (let file of files) {
      if (file.type.match(imgFileTypes)) {
        let reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = function (_e) {
          let readStream = fs.createReadStream(file.path);
          readStream.on('open', function () {
            let _currentPath = currentPath;
            if (altPath != null && altPath != undefined && altPath != '') {
              _currentPath = altPath;
            }
            console.log('_currentPath: ' + _currentPath);
            let path = _currentPath + '/' + file.name;
            console.log('final path: ' + path);
            if (!fs.existsSync(path)) {
              let writeStream = fs.createWriteStream(path)
              readStream.pipe(writeStream);
              readStream.on('end', function() {
                CreateImage(currentPath, file.name, true);
              });
            } else {
              window.alert(path + ' already exists');
            }
          })
        }
      }
    }
  }
}

dropzone.elem.addEventListener('dragover', function (e) {
  e.stopPropagation();
  e.preventDefault();
  e.dataTransfer.dropEffect = 'copy';
}, false)

imageView.addEventListener('dragover', function (e) {
  e.stopPropagation();
  e.preventDefault();
  e.dataTransfer.dropEffect = 'copy';
}, false)

imageView.addEventListener('dragenter', function (e) {
  e.stopPropagation();
  e.preventDefault();
  console.log('dragenter');
  if (dropzone.elem.classList.contains('hidden')) {
    dropzone.elem.classList.remove('hidden');
  }
}, false)

dropzone.elem.addEventListener('dragleave', function (e) {
  e.stopPropagation();
  e.preventDefault();
  console.log('dragleave');
  if (!dropzone.elem.classList.contains('hidden')) {
    dropzone.elem.classList.add('hidden');
  }
}, false)

imageView.addEventListener('drop', function (e) {
  e.stopPropagation();
  e.preventDefault();
  console.log('dropped on imageview')
  dropzone.drop(e);
  if (!dropzone.elem.classList.contains('hidden')) {
    dropzone.elem.classList.add('hidden');
  }

}, false)

dropzone.elem.addEventListener('drop', function (e) {
  e.stopPropagation();
  e.preventDefault();
  console.log('dropped on dropzone')
  dropzone.drop(e);
  if (!dropzone.elem.classList.contains('hidden')) {
    dropzone.elem.classList.add('hidden');
  }

}, false)

let backgroundOptionCtrl = document.getElementById('background-ctrl');
let userStylesCtrl = document.getElementById('user-styles-ctrl');;
let userStylesElem = document.getElementById('user-styles');
let hideSidePanelCtrl = document.getElementById('hide-side-panel-ctrl');
let hideOptionsCtrl = document.getElementById('options-ctrl');
let helpButton = document.getElementById('help-ctrl');
let infoButton = document.getElementById('info-ctrl');
let howToDialog = document.getElementById('how-to');
let infoDialog = document.getElementById('info');
let howToCloseCtrl = document.getElementById('how-to-close-ctrl');
let infoCloseCtrl = document.getElementById('info-close-ctrl');

// global options
let options = {
  columns: 3,
  gutter: 6,
  background: '#f1f2f3',
  userStyles: '',
  sidebar: true
};
let lastDirectory = currentPath;

// other elements
let title = document.getElementsByTagName('title')[0];

// this stores the directory structure for both
// caching access, and client-side access
let leaves = [];

// on load, run the init and the loadfiles functions
window.addEventListener('load', function () {
  InitialLoad();
});

function InitialLoad() {
  console.log('~~~~~~~~~ welcome to moodbored ~~~~~~~~~');
  LoadOptions();
  AddEventsToMainButtons();
  AddEventsToOptionsButtons();
  SetAllLinksExternal();
  SetVersionInfo();

  ToggleSection(leftSide, !options.sidebar);
  ToggleImageContainerSize(!options.sidebar);
  console.log("sidebar on load " + options.sidebar);

  let loadedPath = localStorage.getItem('lastDirectory');
  rootDirectory = localStorage.getItem('rootDirectory');
  console.log('> root is ' + rootDirectory);

  if (rootDirectory == null || rootDirectory == '') {
    HowToDialogToggle();
  } else {
    GetNewDirectoryStructure(rootDirectory);
    CreateFolderView();

    if (loadedPath != null) {
      LoadDirectoryContents(loadedPath);
    } else if (rootDirectory != '') {
      LoadDirectoryContents(rootDirectory);
    }
  }
}


function AddEventsToMainButtons() {
  openFolderCtrl.addEventListener('click', function() {
    OpenNewRootFolder();
  });

  hideOptionsCtrl.addEventListener('click', function () {
    ToggleSection(optionsMenu);
  });

  hideSidePanelCtrl.addEventListener('click', function () {
    ToggleSection(leftSide);
    ToggleImageContainerSize();
  });

  lightbox.elem.addEventListener('click', function () {
    ToggleSection(lightbox.elem, true);
    PreventScroll(false);
  })

  lightbox.img.addEventListener('click', function () {
    ToggleSection(lightbox.elem, true);
    PreventScroll(false);
  })
}

function AddEventsToOptionsButtons() {
  columnOption.label.innerText = options.columns;
  columnOption.ctrl.value = options.columns;
  columnOption.ctrl.addEventListener('input', function() {
    options.columns = this.value;
    columnOption.label.innerText = this.value;
    if (imageElements.length > 0) {
      ResizeImages();
    }
    SaveOptions();
  });

  gutterOption.label.innerText = options.gutter;
  gutterOption.ctrl.value = options.gutter;
  gutterOption.ctrl.addEventListener('input', function() {
    options.gutter = this.value;
    gutterOption.label.innerText = this.value;
    if (imageElements.length > 0) {
      ResizeImages();
    }
    SaveOptions();
  });

  backgroundOptionCtrl.value = options.background;
  mainContainer.style.backgroundColor = options.background;
  backgroundOptionCtrl.addEventListener('input', function() {
    options.background = this.value;
    mainContainer.style.backgroundColor = options.background;
    SaveOptions();
  });

  userStylesCtrl.value = options.userStyles;
  userStylesElem.innerText = options.userStyles;
  userStylesCtrl.addEventListener('input', function() {
    options.userStyles = this.value;
    userStylesElem.innerText = options.userStyles;
    SaveOptions();
  });

  helpButton.addEventListener('click', function () {
    ToggleSection(howToDialog);
  });

  howToCloseCtrl.addEventListener('click', function () {
    ToggleSection(howToDialog);
  });

  infoButton.addEventListener('click', function () {
    ToggleSection(infoDialog);
  });

  infoCloseCtrl.addEventListener('click', function () {
    ToggleSection(infoDialog);
  });

  window.addEventListener('keydown', function (e) {
    if (!lightbox.elem.classList.contains('hidden')) {
      if (e.keyCode == 27) {
        ToggleSection(lightbox.elem);
      } else if (e.keyCode == 37 || e.keyCode == 65) {
        lightbox.increment(-1);
      } else if (e.keyCode == 39 || e.keyCode == 68) {
        lightbox.increment(1);
      }
    } else {
      if (e.keyCode == 27) {
        ToggleSection(leftSide);
        ToggleImageContainerSize();
      }
    }
  });
}

function SetVersionInfo() {
  document.getElementById('version-disp').innerText = require('electron').remote.app.getVersion();
}

function OpenNewRootFolder() {
  dialog.showOpenDialog({properties: ["openDirectory"]}, (folder) => {
    if (folder === undefined) {
      console.log("no file selected");
      return;
    } else {
      console.log(folder);
      let _root = folder[0];
      GetNewDirectoryStructure(_root);
      LoadDirectoryContents(_root, true);
      CreateFolderView();
    }
  })
}

function LoadOptions() {
  _options = localStorage.getItem('options');
  if (_options != null) {
    options = JSON.parse(_options);
    console.log("successfully loaded options");
  } else {
    console.log("no options saved in local storage, going with defaults");
  }
}

function SaveOptions() {
  localStorage.setItem('options', JSON.stringify(options));
  console.log('saved options');
}

function SetAllLinksExternal() {
  const shell = require('electron').shell;
  let _links = document.getElementsByTagName('a');
  for (let link of _links) {
    console.log('add event for ' + link.href);
    link.addEventListener('click', function () {
      event.preventDefault();
      shell.openExternal(this.href);
    })
  }
}

// recursive function that gets the new directories.
// pushes all tail/endpoint directories into `leaves`
function GetNewDirectoryStructure(path) {
  let dir = fs.readdirSync(path);
  if (dir != undefined && dir.length > 0) {
    for (let i = 0; i < dir.length; i++) {
      let file = dir[i];
      let notLeaf = false;

      let stat = fs.lstatSync(path + '//' + file);
      if (!stat.isDirectory()) {
        if (i === dir.length - 1 && !notLeaf) {
          // because it reached the end of the loop and there's no directories,
          // it must be full of images
          leaves.push(path);
        }
      } else {
        let totalPath = path + '/' + file;
        // because there's a directory, it cannot be an end folder
        notLeaf = true;
        // starts the function again in the child directory it found
        GetNewDirectoryStructure(totalPath);
      }
    }
  }
}

function CreateFolderView() {
  ClearChildren(folderView);
  if (leaves.length > 1) {
    leaves.sort();
    for (let leaf of leaves) {
      CreateFolderElement(leaf);
    }
  }

  function CreateFolderElement(totalPath) {
    let sp = document.createElement('button');
    let spTextContent = totalPath.replace(rootDirectory + "/", "");
    spTextContent = spTextContent.replace("/", " / ");
    let spText = document.createTextNode(spTextContent);
    sp.appendChild(spText);

    sp.addEventListener('click', function() {
      LoadDirectoryContents(totalPath);
    });

    sp.addEventListener('dragover', function (e) {
      e.stopPropagation();
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
    }, false);

    sp.addEventListener('drop', function (e) {
      e.stopPropagation();
      e.preventDefault();
      console.log('dropped on folder')
      dropzone.drop(e, totalPath);
    }, false)

    folderView.appendChild(sp);
  }
}


function LoadDirectoryContents(path, newRoot) {
  if (newRoot) {
    rootDirectory = path;
    localStorage.setItem('rootDirectory', rootDirectory);
    console.log('new root: ' + rootDirectory);
    leaves = [];
    GetNewDirectoryStructure(path);
  }

  // if the path that's being requested is different than the currently open
  // path, then load it in. otherwise, don't
  if (path != currentPath) {
    currentPath = path;
    ClearChildren(imageView);
    imageElements = [];

    lastDirectory = currentPath;
    localStorage.setItem('lastDirectory', lastDirectory);
    title.innerText = moodbored + " - " + path;
    LoadImages(currentPath);
  }

  function LoadImages(currentPath) {
    imageSrcs = [];
    fs.readdir(currentPath, (err, dir) => {
      if (dir.length > 0) {
        // filter the directory for only image files
        let filteredDir = dir.filter((f) => {
          return f.match(imgFileTypes);
        });

        let _index = 0;
        for (let file of filteredDir) {
          _index++;
          imageSrcs.push(file);
          if (_index >= filteredDir.length) {
            // done loading all images
            // sort array
            imageSrcs = imageSrcs.sort();
            // then create elements
            for (let img of imageSrcs) {
              CreateImage(currentPath, img);
            }
            console.log('!!!!!!!!! done loading all images !!!!!!!!!');
          }
        }
      }
    })
  }
}

function CreateImage(path, file, dropped) {
  // console.log('path: ' + path + ', file: ' + file);
  let img = new Image();
  let src = path + '/' + file;
  img.src = src;
  ResizeImage(img);
  imageView.appendChild(img);
  img.onload = function () {
    img.classList.add('img-loaded');
  }
  if (dropped) {
    img.classList.add('img-loaded');
  }
  let _index = imageElements.length + 1
  img.addEventListener('click', function () {
    lightbox.setImg(img);
    lightbox.index = _index;
    PreventScroll(true);
  })
  imageElements.push(img);
}

// ~~~~~~~~~ lightbox ~~~~~~~~~

let lightbox = {
  elem: document.getElementById('lightbox'),
  img: document.getElementById('lightboxImg'),
  index: 0,
  setImg: function (_img) {
    this.img.src = _img.src;
    ToggleSection(this.elem);
  },
  increment: function (amount) {
    this.index += amount;
    if (this.index < 0) {
      this.index = imageElements.length - 1;
    } else if (this.index >= imageElements.length) {
      this.index = 0;
    }
    this.img.src = imageElements[this.index].src;
  }
}

// ~~~~~~~~~ utility functions ~~~~~~~~~

function ResizeImages() {
  for (let img of imageElements) {
    ResizeImage(img);
  }
}

function PreventScroll(force) {
  body.classList.toggle('no-scroll', force);
}

function ToggleSection(section, force) {
  section.classList.toggle('hidden', force);
}

function ToggleImageContainerSize(force) {
  options.sidebar = !rightSide.classList.toggle('expand', force);
  console.log("sidebar on save: " + options.sidebar);
  SaveOptions();
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
