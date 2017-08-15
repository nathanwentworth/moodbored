'use strict';

const moodbored = 'moodbored';

// requires
const { remote } = require('electron');
const { Menu, MenuItem } = remote;
const { dialog } = remote;
const fs = require('fs');
const request = require('request');
const trash = require('trash');
const shell = require('electron').shell;

const _options = require('./js/renderer/options.js');

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
let openFolderCtrl = document.getElementById('open-folder-ctrl');

let dropzone = {
  elem: document.getElementById('image-drop'),
  drop: function (e, altPath) {
    let files = e.dataTransfer.files;
    let _currentPath = (altPath != null) ? altPath : currentPath;
    if (files.length > 0) {
      for (let file of files) {
        if (file.type.match(imgFileTypes)) {
          let reader = new FileReader();
          reader.readAsDataURL(file);
          reader.addEventListener('load', (_e) => {
            let readStream = fs.createReadStream(file.path);
            readStream.on('open', () => {
              let path = _currentPath + '/' + file.name;
              if (!fs.existsSync(path)) {
                let writeStream = fs.createWriteStream(path)
                readStream.pipe(writeStream);
                readStream.on('end', () => {
                  CreateImage(currentPath, file.name, true);
                  if (options.moveFile) {
                    fs.unlinkSync(file.path);
                  }
                  dropzone.elem.innerText = 'file successfully added!';
                  setTimeout(() => {
                    if (!dropzone.elem.classList.contains('hidden')) {
                      dropzone.elem.classList.add('hidden');
                    }
                  }, 1000);
                });
              } else {
                dropzone.elem.innerText = 'file not add, ' + file.name + ' already exists';
                setTimeout(() => {
                  if (!dropzone.elem.classList.contains('hidden')) {
                    dropzone.elem.classList.add('hidden');
                  }
                }, 1500);
              }
            })
          }, false);
        }
      }
    } else {
      let data = e.dataTransfer.getData('text/html');
      data = data.substring(data.indexOf('src="') + 5);
      let imgSrc = /http[^"\n\r]*(?=")/i;
      let dataUrl = data.match(imgSrc);
      dataUrl = dataUrl[0];
      if (dataUrl.match(imgFileTypes)) {
        let _dataFileName = dataUrl.substring(dataUrl.lastIndexOf('/')+1);
        let path = _currentPath + '/' + _dataFileName;
        if (!fs.existsSync(path)) {
          let writeStream = fs.createWriteStream(path);
          let r = request(dataUrl);
          r.pipe(writeStream);
          r.on('end', function() {
            CreateImage(currentPath, _dataFileName, true);
          });
          dropzone.elem.innerText = 'file successfully added!';
          setTimeout(() => {
            if (!dropzone.elem.classList.contains('hidden')) {
              dropzone.elem.classList.add('hidden');
            }
          }, 1000);
        } else {
          dropzone.elem.innerText = 'file not uploaded, ' + _dataFileName + ' already exists';
          setTimeout(() => {
            if (!dropzone.elem.classList.contains('hidden')) {
              dropzone.elem.classList.add('hidden');
            }
          }, 1500);
        }
      }
    }
  }
}

dropzone.elem.addEventListener('dragover', (e) => {
  e.stopPropagation();
  e.preventDefault();
  e.dataTransfer.dropEffect = 'copy';
}, false)

imageView.addEventListener('dragover', (e) => {
  e.stopPropagation();
  e.preventDefault();
  e.dataTransfer.dropEffect = 'copy';
}, false)

imageView.addEventListener('dragenter', (e) => {
  e.stopPropagation();
  e.preventDefault();
  if (dropzone.elem.classList.contains('hidden')) {
    dropzone.elem.innerText = "drop here to add image to folder";
    dropzone.elem.classList.remove('hidden');
  }
}, false)

dropzone.elem.addEventListener('dragleave', (e) => {
  e.stopPropagation();
  e.preventDefault();
  if (!dropzone.elem.classList.contains('hidden')) {
    dropzone.elem.classList.add('hidden');
  }
}, false)

imageView.addEventListener('drop', (e) => {
  e.stopPropagation();
  e.preventDefault();
  dropzone.drop(e);
}, false)

dropzone.elem.addEventListener('drop', (e) => {
  e.stopPropagation();
  e.preventDefault();
  dropzone.drop(e);
}, false)

let hideSidePanelCtrl = document.getElementById('hide-side-panel-ctrl');
let hideOptionsCtrl = document.getElementById('options-ctrl');
let howToCloseCtrl = document.getElementById('how-to-close-ctrl');
let infoCloseCtrl = document.getElementById('info-close-ctrl');

let helpButton = document.getElementById('help-ctrl');
let infoButton = document.getElementById('info-ctrl');
let howToDialog = document.getElementById('how-to');
let infoDialog = document.getElementById('info');
let keyCommandDialog = document.getElementById('key-commands');

let options = {};
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
  options = _options.load();
  AddEventsToButtons();
  SetAllLinksExternal();
  SetVersionInfo();

  ToggleSection(leftSide, !options.sidebar);
  ToggleImageContainerSize(!options.sidebar);

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

  mainContainer.classList.add('fade-in');
}

function AddEventsToButtons() {
  openFolderCtrl.addEventListener('click', function() {
    OpenNewRootFolder();
  });

  hideOptionsCtrl.addEventListener('click', function () {
    ToggleSection(_options.elements.menu);
  });

  hideSidePanelCtrl.addEventListener('click', function () {
    ToggleSection(leftSide);
    ToggleImageContainerSize();
  });

  lightbox.elem.addEventListener('click', function () {
    lightbox.display(false);
  }, false)

  lightbox.arrowL.addEventListener('click', function (e) {
    lightbox.increment(-1);
    e.stopPropagation();
  })

  lightbox.arrowR.addEventListener('click', function (e) {
    lightbox.increment(1);
    e.stopPropagation();
  })


  _options.elements.columnOptionLabel.innerText = options.columns;
  _options.elements.columnOptionCtrl.value = options.columns;
  _options.elements.columnOptionCtrl.addEventListener('input', function() {
    options.columns = this.value;
    _options.elements.columnOptionLabel.innerText = this.value;
    if (imageElements.length > 0) {
      ResizeImages();
    }
    _options.save(options);
  });

  _options.elements.gutterOptionLabel.innerText = options.gutter;
  _options.elements.gutterOptionCtrl.value = options.gutter;
  _options.elements.gutterOptionCtrl.addEventListener('input', function() {
    options.gutter = this.value;
    _options.elements.gutterOptionLabel.innerText = this.value;
    if (imageElements.length > 0) {
      ResizeImages();
    }
    _options.save(options);
  });

  _options.elements.backgroundCtrl.value = options.background;
  mainContainer.style.backgroundColor = options.background;
  _options.elements.backgroundCtrl.addEventListener('input', function() {
    options.background = this.value;
    mainContainer.style.backgroundColor = options.background;
    _options.save(options);
  });

  _options.elements.userStylesCtrl.value = options.userStyles;
  _options.elements.userStylesElem.innerText = options.userStyles;
  _options.elements.userStylesCtrl.addEventListener('input', function() {
    options.userStyles = this.value;
    _options.elements.userStylesElem.innerText = options.userStyles;
    _options.save(options);
  });

  _options.elements.moveFilesCtrl.checked = options.moveFile;
  _options.elements.moveFilesCtrl.addEventListener('click', function() {
    options.moveFile = this.checked;
    _options.save(options);
    console.log(options.moveFile);
  });

  _options.elements.confirmDeleteCtrl.checked = options.confirmDelete;
  _options.elements.confirmDeleteCtrl.addEventListener('click', function() {
    options.confirmDelete = this.checked;
    _options.save(options);
    console.log(options.confirmDelete);
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
      // esc, close lightbox
      if (e.keyCode == 27) {
        lightbox.display(false);
        // left/a, go left in lightbox
      } else if (e.keyCode == 37 || e.keyCode == 65) {
        lightbox.increment(-1);
        // right/d, go right in lightbox
      } else if (e.keyCode == 39 || e.keyCode == 68) {
        lightbox.increment(1);
      }
    } else {
      // esc, toggle sidebar
      if (e.keyCode == 27) {
        ToggleSection(leftSide);
        ToggleImageContainerSize();
        // ?, toggle key command dialog
      } else if (e.shiftKey && e.keyCode == 191) {
        ToggleSection(keyCommandDialog);
      }
    }
  });
}

// set version info in the info screen
function SetVersionInfo() {
  document.getElementById('version-disp').innerText = remote.app.getVersion();
}

// open a system dialog to select a new root folder
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

// sets a links to open in an external browser
function SetAllLinksExternal() {
  let links = document.getElementsByTagName('a');
  for (let link of links) {
    link.addEventListener('click', function () {
      event.preventDefault();
      shell.openExternal(this.href);
    });
  }
}

// recursive function that gets the new directories.
// pushes all tail/endpoint directories into `leaves`
function GetNewDirectoryStructure(path) {
  let dir = fs.readdirSync(path);
  if (dir !== undefined && dir.length > 0) {
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
    leaves.forEach((element) => {
      CreateFolderElement(element);
    });
  }

  function CreateFolderElement(totalPath) {
    let sp = document.createElement('button');
    let spTextContent = totalPath.replace(rootDirectory + "/", "");
    spTextContent = spTextContent.replace("/", " / ");
    let spText = document.createTextNode(spTextContent);
    sp.appendChild(spText);

    sp.addEventListener('click', () => {
      LoadDirectoryContents(totalPath);
    });

    sp.addEventListener('dragover', (e) => {
      e.stopPropagation();
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
    }, false);

    sp.addEventListener('drop', (e) => {
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
          console.log('> done loading all images');
        }
      }
    }
  })
}

function CreateImage(path, file, dropped) {
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
  arrowL: document.getElementById('arrow-left'),
  arrowR: document.getElementById('arrow-right'),
  index: 0,
  setImg: function (_img) {
    this.img.src = _img.src;
    lightbox.display(true);
  },
  increment: function (amount) {
    this.index += amount;
    if (this.index < 0) {
      this.index = imageElements.length - 1;
    } else if (this.index >= imageElements.length) {
      this.index = 0;
    }
    this.img.src = imageElements[this.index].src;
  },
  display: function (disp) {
    ToggleSection(lightbox.elem, !disp);
    PreventScroll(disp);
  }
}

// ~~~~~~~~~ utility functions ~~~~~~~~~

function ResizeImages() {
  imageElements.forEach((element) => {
    ResizeImage(element);
  })
}

function PreventScroll(force) {
  body.classList.toggle('no-scroll', force);
}

function ToggleSection(section, force) {
  section.classList.toggle('hidden', force);
}

function ToggleImageContainerSize(force) {
  options.sidebar = !rightSide.classList.toggle('expand', force);
  _options.save(options);
}

function ResizeImage(img) {
  img.style.width = "calc(100% / " + options.columns + " - " + (options.gutter * 2) + "px)";
  img.style.margin = options.gutter + "px";
}

function ClearChildren(parent) {
  while (parent.firstChild) {
    parent.removeChild(parent.firstChild);
  }
}

// ~~~~~~~~~ right click menu ~~~~~~~~~

function CreateRightClickMenu(target) {
  let src = target.src;
  let rightClickMenu = new Menu();

  if (src != null && src.match(imgFileTypes)) {
    src = src.replace(/%20/g, ' ');
    src = src.replace(/file:\/\//g, '');
    let _name = src.substring(src.lastIndexOf('/')+1);
    rightClickMenu.append(new MenuItem({
      label: _name,
      enabled: false
    }));

    rightClickMenu.append(new MenuItem({
      type: 'separator'
    }));

    rightClickMenu.append(new MenuItem({
      label: 'Delete Image',
      click() {
        if (options.confirmDelete) {
          if (window.confirm("Are you sure you want to delete \"" + _name + "\"?")) {
            trash(src).then(() => {
              target.remove();
            });
          }
        } else {
          trash(src).then(() => {
            target.remove();
          });
        }
      }
    }));

    rightClickMenu.append(new MenuItem({
      label: 'Open in Folder',
      click() {
        shell.showItemInFolder(src);
      }
    }));
  }

  return rightClickMenu;
}

window.addEventListener('contextmenu', (e) => {
  e.preventDefault();
  let target = e.target;
  CreateRightClickMenu(target).popup(remote.getCurrentWindow())
}, false);
