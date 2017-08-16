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

// ~~~~~~~~~ drag and drop ~~~~~~~~~

var dropzone = function () {
  var elem = document.getElementById('image-drop');

  function init() {
    elem.addEventListener('dragover', copy, false)
    imageView.addEventListener('dragover', copy, false)

    imageView.addEventListener('dragenter', (e) => {
      e.stopPropagation();
      e.preventDefault();
      if (elem.classList.contains('hidden')) {
        elem.innerText = "drop here to add image to folder";
        elem.classList.remove('hidden');
      }
    }, false)

    elem.addEventListener('dragleave', (e) => {
      e.stopPropagation();
      e.preventDefault();
      if (!elem.classList.contains('hidden')) {
        elem.classList.add('hidden');
      }
    }, false)

    imageView.addEventListener('drop', dropEv, false)
    elem.addEventListener('drop', dropEv, false)

    function dropEv(e) {
      e.stopPropagation();
      e.preventDefault();
      drop(e);
    }
  }
  init();

  function copy (e) {
    e.dataTransfer.dropEffect = (options.moveFile) ? 'move' : 'copy';
    e.preventDefault();
    e.stopPropagation();
  }

  function drop (e, altPath) {
    let files = e.dataTransfer.files;
    // if f is true, it's a file, false it's data
    let f = (files.length > 0);
    if (f) {
      for (let file of files) {
        upload(file, altPath, true);
      }
    } else {
      let data = e.dataTransfer.getData('text/html');
      upload(data, altPath, false);
    }
  }

  function upload(data, altPath, f) {
    // set local data var
    let _data = data;

    let _currentPath = altPath || currentPath;
    let path = _currentPath + '/';
    let name = '';

    if (!f) {
      let imgSrc = /http[^"\n\r]*(?=")/i;
      _data = _data.substring(_data.indexOf('src="') + 5).match(imgSrc)[0];
    }

    var isImage = (f) ? _data.type.match(imgFileTypes) : _data.match(imgFileTypes);

    if (isImage) {
      name = (f) ? _data.name : _data.substring(_data.lastIndexOf('/') + 1);
      path += name;

      if (!fs.existsSync(path)) {
        let r = (f) ? fs.createReadStream(_data.path) : request(_data);
        let writeStream = fs.createWriteStream(path);
        if (f) {
          r.on('open', () => {
            writeImage();
          })
        } else {
          writeImage();
        }

        function writeImage() {
          r.pipe(writeStream);
          r.on('end', function() {
            CreateImage(currentPath, name, true);
          });
        }

        if (f && options.moveFile) {
          fs.unlinkSync(_data.path);
        }

        notification(true, name);

      } else {
        notification(false, name, 'file already exists');
      }
    } else {
      notification(false, name, 'not an image');
    }
  }

  function notification (success, name, reason, time) {
    let _time = time || 1250;
    let _reason = reason || '';
    let text = '';
    let result = (success) ? ' successfully added!' : ' not added, ';
    text = name + result + _reason;
    dropzone.elem.innerText = text;
    setTimeout(() => {
      if (!dropzone.elem.classList.contains('hidden')) {
        dropzone.elem.classList.add('hidden');
      }
    }, _time);
  }

  return {
    elem: elem,
    copy: copy,
    drop: drop
  }
}();

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
window.addEventListener('load', InitialLoad, false);

function InitialLoad() {
  console.log('~~~~~~~~~ welcome to moodbored ~~~~~~~~~');
  options = _options.load();
  AddEventsToButtons();
  OptionsInit();
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

function OptionsInit() {
  Object.keys(_options.elements).forEach((key) => {
    var optionElement = _options.elements[key];
    optionElement.ctrl.value = _options[key];
    optionElement.ctrl.checked = _options[key];
    if (optionElement.label) {
      optionElement.label.innerText = _options[key];
    }
  });

  mainContainer.style.backgroundColor = options.background;
  _options.elements.userStyles.elem.innerText = options.userStyles;
}

function OptionsController(e) {
  var target = e.target;
  var opt = target.dataset.option;
  if (target.tagName == 'INPUT') {
    if (target.type == 'checkbox') {
      options[opt] = target.checked;
    } else if (target.type == 'text') {
      options[opt] = target.value;
      if (opt == 'background') {
        mainContainer.style.backgroundColor = options.background;
      }
    } else if (target.type == 'range') {
      options[opt] = target.value;
      _options.elements[opt].label.innerText = target.value;
      if (imageElements.length > 0) {
        ResizeImages();
      }
    }

  } else if (target.tagName == 'TEXTAREA') {
    if (opt == 'userStyles') {
      options[opt] = target.value;
      _options.elements.userStyles.elem.innerText = options.userStyles;
    }
  }

  _options.save(options);
}

function AddEventsToButtons() {
  openFolderCtrl.addEventListener('click', OpenNewRootFolder, true);

  hideOptionsCtrl.addEventListener('click', function () {
    ToggleSection(_options.menu);
  });

  hideSidePanelCtrl.addEventListener('click', function () {
    ToggleSection(leftSide);
    ToggleImageContainerSize();
  });

  let optionsMenu = document.getElementById('options-menu');

  optionsMenu.addEventListener('input', OptionsController, false);
  optionsMenu.addEventListener('click', OptionsController, false);

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
    if (!lightbox.hidden) {
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
    link.addEventListener('click', openLink, false);
  }

  function openLink(e) {
    e.preventDefault();
    shell.openExternal(this.href);
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

    sp.addEventListener('dragover', dropzone.copy, false);

    sp.addEventListener('drop', (e) => {
      e.stopPropagation();
      e.preventDefault();
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
  img.addEventListener('click', imageEvents, false);
  imageElements.push(img);

  function imageEvents() {
    lightbox.setImg(img);
    lightbox.index = _index;
    PreventScroll(true);
  }
}

// ~~~~~~~~~ lightbox ~~~~~~~~~

var lightbox = function () {
  var elem = document.getElementById('lightbox');
  var img = document.getElementById('lightboxImg');
  var arrowL = document.getElementById('arrow-left');
  var arrowR = document.getElementById('arrow-right');
  var index = 0;
  var hidden = !elem.classList.contains('hidden');

  function init() {
    arrowL.addEventListener('click', function (e) {
      increment(-1);
      e.stopPropagation();
    })

    arrowR.addEventListener('click', function (e) {
      increment(1);
      e.stopPropagation();
    })

    elem.addEventListener('click', function () {
      display(false);
    }, false)
  }
  init();

  function setImg(_img) {
    img.src = _img.src;
    lightbox.display(true);
  }

  function increment(amount) {
    index += amount;
    if (index < 0) {
      index = imageElements.length - 1;
    } else if (index >= imageElements.length) {
      index = 0;
    }
    img.src = imageElements[index].src;
  }

  function display(disp) {
    hidden = !disp;
    ToggleSection(elem, !disp);
    PreventScroll(disp);
  }

  return {
    setImg: setImg,
    increment: increment,
    display: display,
    index: index,
    hidden: hidden
  }
}();

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
