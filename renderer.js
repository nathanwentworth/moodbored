'use strict';

const moodbored = 'moodbored';

// requires
const { remote, clipboard, nativeImage } = require('electron');
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
let sidebar = document.getElementById('sidebar');
let view = document.getElementById('view');
let folderView = document.getElementById('folders');
let imageView = document.getElementById('images');

let lastFolderButton = null;

let imageData = {};

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
    let localFile = (e.dataTransfer.files.length > 0);
    let files = (localFile) ? e.dataTransfer.files : [e.dataTransfer.getData('text/html')];
    // if localFile is true, it's a file, false it's data
    for (let file of files) {
      upload(file, altPath, localFile);
    }
  }

  function upload(data, altPath, localFile) {
    let isFolder = !data.type && localFile
    if (isFolder) {
      console.log('is a folder!')
      console.log(data.path)
      let _root = data.path;
      console.log(_root)
      GetNewDirectoryStructure(_root);
      LoadDirectoryContents(_root, true);
      CreateFolderView();

      notification({ custom: 'new folder successfully added!' });
      return;
    }
    // set local data var
    let _data = data;

    let _currentPath = altPath || currentPath;
    let path = _currentPath + '/';
    let name = '';
    let domain = '';

    if (!localFile) {
      let imgSrc = /http[^"\n\r]*(?=")/i;
      _data = _data.substring(_data.indexOf('src="') + 5).match(imgSrc)[0];
      domain = _data.substring(0, _data.indexOf('/') + 1)
      // console.log('domain: ' + domain)
    }

    let isImage = (localFile) ? _data.type.match(imgFileTypes) : _data.match(imgFileTypes);

    if (!isImage) {
      notification({ success: false, name: name, reason: 'not an image' });
      return;
    }

    let date = new Date().toISOString().replace(/:/gi, '.');
    name = (localFile) ? _data.name : date + isImage[0];
    path += name;

    if (fs.existsSync(path)) {
      notification({ success: false, name: name, reason: 'file already exists' });
      return;
    }

    let r = (localFile) ? fs.createReadStream(_data.path) : request(_data);
    if (localFile) {
      r.on('open', () => {
        writeImage();
      })
    } else {
      writeImage();
    }

    function writeImage() {
      r.pipe(fs.createWriteStream(path));
      r.on('end', function() {
        console.log('image done loading, creating image');
        CreateImage(currentPath, name, true);
      });
    }

    if (localFile && options.moveFile) {
      fs.unlinkSync(_data.path);
    }

    notification({ success: true, name: name });
  }


  // arg object structure
  // success, name, reason, time
  // {
  //   success: bool,
  //   name: string,
  //   reason: string,
  //   time: int
  // }
  function notification (args) {
    let _time = args.time || 1250;
    if (args.custom) {
      dropzone.elem.innerText = args.custom
      setTimeout(() => {
        dropzone.elem.classList.add('hidden');
      }, _time);
      return;
    }
    let _name = args.name || 'this file';
    let _reason = args.reason || '';
    let text = '';
    let result = (args.success) ? ' successfully added!' : ' not added, ';
    text = _name + result + _reason;
    dropzone.elem.innerText = text;
    setTimeout(() => {
      dropzone.elem.classList.add('hidden');
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

  ToggleSection(sidebar, !options.sidebar);

  let loadedPath = localStorage.getItem('lastDirectory');
  rootDirectory = localStorage.getItem('rootDirectory');
  console.log('> root is ' + rootDirectory);

  if (rootDirectory == null || rootDirectory == '') {
    ToggleSection(howToDialog, false)
  } else {
    GetNewDirectoryStructure(rootDirectory);
    CreateFolderView();

    if (loadedPath != null) {
      LoadDirectoryContents(loadedPath);
    } else if (rootDirectory != '') {
      LoadDirectoryContents(rootDirectory);
    }
  }

  loadDb();

  mainContainer.classList.add('fade-in');
}

function OptionsInit() {
  Object.keys(_options.elements).forEach((key) => {
    var optionElement = _options.elements[key];
    optionElement.ctrl.value = options[key];
    console.log(key + ': ' + optionElement.ctrl.value);
    optionElement.ctrl.checked = _options[key];
    if (optionElement.label) {
      optionElement.label.innerText = _options[key];
    }
  });

  mainContainer.style.backgroundColor = options.background;
  _options.elements.userStyles.elem.innerText = options.userStyles;
  SetSidebarSide(options.sidebarSide);
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
  } else if (target.tagName == 'SELECT') {
    if (opt == 'sidebarSide') {
      options[opt] = target.value;
      SetSidebarSide(target.value);
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
    ToggleSection(sidebar);
    options.sidebar = !options.sidebar;
    _options.save(options);
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
        ToggleSection(sidebar);
        options.sidebar = !options.sidebar;
        _options.save(options);
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
    }

    console.log(folder);
    let _root = folder[0];
    GetNewDirectoryStructure(_root);
    LoadDirectoryContents(_root, true);
    CreateFolderView();
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
    let folderButton = document.createElement('button');
    let trimmedFolderButtonTextContent = totalPath.replace(rootDirectory + "/", "");
    console.log('creating', trimmedFolderButtonTextContent)
    let folderHierarchy = trimmedFolderButtonTextContent.split('/');
    // console.log('folderHierarchy', folderHierarchy)
    for (var i = 0; i < folderHierarchy.length; i++) {
      // if (folderHierarchy[i].length > 16) {
      //   folderHierarchy[i] = folderHierarchy[i].substring(0,15) + '…'
      //   console.log('folder name is too long!', folderHierarchy[i])
      // }
    }
    let folderButtonTextContent = folderHierarchy.join(' / ');

    folderButton.setAttribute('title', trimmedFolderButtonTextContent)
    folderButton.innerText = folderButtonTextContent;

    folderButton.addEventListener('click', () => {
      if (lastFolderButton) {
        lastFolderButton.classList.remove('active')
      }
      lastFolderButton = folderButton;
      folderButton.classList.add('active')
      LoadDirectoryContents(totalPath);
    });

    folderButton.addEventListener('dragover', dropzone.copy, false);

    folderButton.addEventListener('drop', (e) => {
      e.stopPropagation();
      e.preventDefault();
      dropzone.drop(e, totalPath);
    }, false)

    folderView.appendChild(folderButton);
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
    if (dir.length <= 0) { return; }

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
  })
}

function CreateImage(path, file, dropped) {
  let img = new Image();
  let src = path + '/' + file;
  img.src = src;
  img.dataset.index = imageElements.length;
  img.dataset.name = file;
  ResizeImages();
  imageView.appendChild(img);
  img.onload = function () {
    img.classList.add('img-loaded');
  }
  if (dropped) {
    img.classList.add('img-loaded');
  }
  img.addEventListener('click', imageEvents, false);
  imageElements.push(img);

  function imageEvents() {
    lightbox.setImg(img);
    lightbox.setIndex(+img.dataset.index);
    PreventScroll(true);
  }
}

function saveDb() {
  console.log('saving db!');
  fs.writeFile(rootDirectory + '/moodbored.json', JSON.stringify(imageData), (err) => {
    if (err) throw err;
    console.log('saved data!', imageData);
  })
}

function loadDb() {
  let dataDir = rootDirectory + '/moodbored.json';
  if (fs.existsSync(dataDir)) {
    imageData = JSON.parse(fs.readFileSync(dataDir));
    console.log('loaded data!');
  }
}

function copyImage(src) {
  clipboard.writeImage(nativeImage.createFromPath(src));
}

// ~~~~~~~~~ lightbox ~~~~~~~~~

let lightbox = function () {
  let elem = document.getElementById('lightbox');
  let img = document.getElementById('lightboxImg');
  let currentImage = null;
  let description = {
    close: elem.querySelector('.close'),
    title: elem.querySelector('.file-name'),
    notes: elem.querySelector('.notes'),
    source: elem.querySelector('.source'),
    save: elem.querySelector('.save'),
    copy: elem.querySelector('.copy'),
  }
  let arrowL = document.getElementById('arrow-left');
  let arrowR = document.getElementById('arrow-right');
  let index = 0;
  let hidden = !elem.classList.contains('hidden');

  function init() {
    arrowL.addEventListener('click', function (e) {
      increment(-1);
      e.stopPropagation();
    });

    arrowR.addEventListener('click', function (e) {
      increment(1);
      e.stopPropagation();
    });

    // img.addEventListener('click', function () {
    //   display(false);
    // }, false);

    description.close.addEventListener('click', function () {
      display(false);
    }, false);

    description.copy.addEventListener('click', function () {
      copyImage(currentImage.src);
    }, false);

    description.save.addEventListener('click', () => {
      if (!imageData[currentImage.dataset.name]) {
        imageData[currentImage.dataset.name] = {};
      }

      imageData[currentImage.dataset.name].notes = description.notes.value;
      saveDb();
    });

  }
  init();

  function setImg(_img) {
    currentImage = _img;
    img.src = _img.src;
    description.title.textContent = _img.dataset.name;
    arrowL.style.backgroundImage = 'url("' + getIncrementedImg(-1).img.src + '")';
    arrowR.style.backgroundImage = 'url("' + getIncrementedImg(2).img.src + '")';
    console.log(imageData, _img.dataset.name);
    if (imageData[_img.dataset.name]) {
      description.notes.value = imageData[_img.dataset.name].notes;
    } else {
      description.notes.value = '';
    }
    // const vw = Math.max(document.documentElement.clientWidth, window.innerWidth || 0);
    // const vh = Math.max(document.documentElement.clientHeight, window.innerHeight || 0);
    // let imageAspect = img.width / img.height;
    // let browserAspect = vh / vw;
    // if (imageAspect > browserAspect) {
    //   elem.classList.add('vertical');
    //   elem.classList.remove('horizontal');
    //   // image is wider than browser, show info on bottom
    // } else {
    //   elem.classList.remove('vertical');
    //   elem.classList.add('horizontal');
    //   // image is narrower than browser, show info on side
    // }
    // console.log('image aspect', imageAspect);
    lightbox.display(true);
  }

  function setIndex(_index) {
    index = _index;
  }

  function increment(amount) {
    if (document.activeElement === description.notes) {
      return;
    }
    let val = getIncrementedImg(amount);
    setImg(val.img);
    setIndex(val.index);
  }

  function getIncrementedImg(amount) {
    let _index = index += amount;
    if (_index < 0) {
      _index = imageElements.length - 1;
    } else if (_index >= imageElements.length) {
      _index = 0;
    }
    return {
      img: imageElements[_index],
      index: _index
    };
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
    setIndex: setIndex,
    hidden: hidden
  }
}();

// ~~~~~~~~~ sidebar side ~~~~~~~~~

function SetSidebarSide(side) {
  if (side === 'left') {
    main.classList.add('sidebar-left');
    main.classList.remove('sidebar-right');
  } else if (side === 'right') {
    main.classList.add('sidebar-right');
    main.classList.remove('sidebar-left');
  } else {
    console.error('sidebar side is incorrect: ' + side);
  }
  console.log(side);
}

// ~~~~~~~~~ utility functions ~~~~~~~~~

function ResizeImages() {
  imageView.style.columnCount = options.columns;
  imageView.style.columnGap = options.gutter + 'px';
  document.getElementById('image-gutter-style').innerText = `
  .images img {
    margin-bottom: ${options.gutter}px;
  }`
}

function PreventScroll(force) {
  body.classList.toggle('no-scroll', force);
}

function ToggleSection(section, force) {
  section.classList.toggle('hidden', force);
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

  if (src && src.match(imgFileTypes)) {
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

    rightClickMenu.append(new MenuItem({
      label: 'Copy Image',
      click() {
        copyImage(src);
      }
    }));

    // rightClickMenu.append(new MenuItem({
    //   label: 'Paste Image',
    //   click() {
    //     clipboard.readImage();
    //   }
    // }));
  }

  return rightClickMenu;
}

window.addEventListener('contextmenu', (e) => {
  e.preventDefault();
  let target = e.target;
  CreateRightClickMenu(target).popup(remote.getCurrentWindow())
}, false);
