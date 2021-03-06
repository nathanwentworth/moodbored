'use strict';

const moodbored = 'moodbored';

// requires
const { ipcRenderer, remote, clipboard, nativeImage } = require('electron');
const { Menu, MenuItem } = remote;
const { dialog } = remote;
const fs = require('fs');
const trash = require('trash');
const shell = require('electron').shell;

const _options = require('./js/renderer/options.js');

// directory variables
let rootDirectory = '';
let currentPath = rootDirectory;
let currentImage = null;

// temporary element storage
let imageElements = [];
let imgFileTypes = /.(jpg|png|gif|jpeg|bmp|webp|svg)/;
let vidFileTypes = /.(mp4|mov|webm|m4v)/;
let txtFileTypes = /.(txt|md|markdown|mdown)/;

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
let searchView = document.getElementById('search-box');
let searchBox = searchView.querySelector('input[type=text]');
let searchButton = searchView.querySelector('input[type=submit]');

// ~~~~~~~~~ drag and drop ~~~~~~~~~

var dropzone = function () {
  var elem = document.getElementById('image-drop');
  let droppedFiles = [];
  let uploadIndex = 0;
  let uploadPath = null;

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
    // if localFile is true, it's a file, false it's data
    droppedFiles = e.dataTransfer.files;
    uploadPath = altPath;
    upload(droppedFiles[0], uploadPath);
  }

  function attemptUpload() {
    uploadIndex++;
    console.log('attempting upload of index', uploadIndex);
    if (uploadIndex < droppedFiles.length) {
      upload(droppedFiles[uploadIndex], uploadPath);
      return true;
    } else {
      droppedFiles = [];
      uploadPath = null;
      return false;
    }
  }

  function upload(data, altPath) {
    console.log('uploading', data);
    if (!data.type && data.path) {
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

    let isImage = Buffer.isBuffer(_data) || _data.type.match(imgFileTypes);

    if (!isImage) {
      notification({ success: false, name: name, reason: 'not an image' });
      return;
    }

    let date = new Date().toISOString().replace(/:/gi, '-');
    name = _data.name || date + '.png';
    path += name;

    if (fs.existsSync(path)) {
      notification({ success: false, name: name, reason: 'file already exists' });
      return;
    }
    if (_data.path) {
      let req = fs.createReadStream(_data.path);
      req.on('open', () => {
        req.pipe(fs.createWriteStream(path));
      });
      req.on('end', function() {
        console.log('image done loading, creating image');
        CreateImage(currentPath, name, true);
      });

      if (options.moveFile) {
        fs.unlinkSync(_data.path);
      }
    } else {
      console.log(path, date, name);
      fs.writeFile(path, data, 'binary', function(err) {
        if (err) {
          console.error(err);
          return;
        }

        CreateImage(currentPath, name, true);
      });
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
    elem,
    copy,
    drop,
    attemptUpload,
    upload,
    droppedFiles,
    uploadIndex
  }
}();

let hideOptionsCtrl = document.getElementById('options-close-ctrl');
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
    loadDb();

    GetNewDirectoryStructure(rootDirectory);
    CreateFolderView();

    if (loadedPath != null) {
      LoadDirectoryContents(loadedPath);
    } else if (rootDirectory != '') {
      LoadDirectoryContents(rootDirectory);
    }

    saveDb();
  }


  ipcRenderer.on('OpenNewRootFolder', (event) => {
    OpenNewRootFolder();
  });

  ipcRenderer.on('openSettings', (event) => {
    ToggleSection(_options.menu);
  });

  ipcRenderer.on('showSearch', (event) => {
    ToggleSection(searchView);
    searchBox.focus();
  });

  ipcRenderer.on('toggleSidebar', (event) => {
    toggleSidebar();
  });

  searchButton.addEventListener('click', () => {
    console.log(searchBox.value);
    find(searchBox.value);
  });

  window.addEventListener('paste', (event) => {
    var items = (event.clipboardData || event.originalEvent.clipboardData).items;
    console.log(JSON.stringify(items)); // will give you the mime types
    for (let index in items) {
      var item = items[index];
      if (item.kind === 'file') {
        var blob = item.getAsFile();
        var reader = new FileReader();
        reader.onload = function(event){
          console.log(event.target.result)}; // data url!
        reader.readAsDataURL(blob);
      }
    }
  })


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

function toggleSidebar() {
  ToggleSection(sidebar);
  options.sidebar = !options.sidebar;
  _options.save(options);
}

function AddEventsToButtons() {
  // openFolderCtrl.addEventListener('click', OpenNewRootFolder, true);

  hideOptionsCtrl.addEventListener('click', function () {
    ToggleSection(_options.menu);
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
    // esc, hide edit, then hide lightbox, then hide/toggle sidebar
    if (e.keyCode === 27) {
      if (edit.hidden() === false) {
        edit.hide();
      } else if (lightbox.hidden() === false) {
        lightbox.display(false);
      } else {
        ToggleSection(sidebar);
        options.sidebar = !options.sidebar;
        _options.save(options);
      }
    }
    if (lightbox.hidden() === false) {
      if (e.keyCode == 37 || e.keyCode == 65) {
        lightbox.increment(-1);
        // right/d, go right in lightbox
      } else if (e.keyCode == 39 || e.keyCode == 68) {
        lightbox.increment(1);
      }
    } else {
      if (e.shiftKey && e.keyCode == 191) {
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
  dialog.showOpenDialog({properties: ["openDirectory"]}).then( (result) => {
    if (result.cancelled && result.filePaths && result.filePaths[0]) {
      console.log("no file selected");
      return;
    }

    console.log('new result', result);
    let _root = result.filePaths[0];
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

// search though files and filter on new files
function find(query) {
  let fileNames = Object.keys(imageData);
  let found = [];
  for (let i = 0; i < fileNames.length; i++) {
    let key = fileNames[i];
    if (!imageData[key]) { continue; }
    let titleMatch = key.indexOf(query) > -1;
    if (!imageData[key].tags) { imageData[key].tags = '' }
    let tagMatch = imageData[key].tags.indexOf(query) > -1;
    if (!imageData[key].source) { imageData[key].source = '' }
    let sourceMatch = imageData[key].source.indexOf(query) > -1;
    if (titleMatch || tagMatch || sourceMatch) {
      found.push(imageData[key]);
      console.log(imageData[key]);
    }
  }
  if (found.length > 0) {
    ClearChildren(imageView);
    LoadImages(null, found);
  } else {
    
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
        let data = imageData[file];
        if (!data) { data = {} }
        data.path = path.replace(rootDirectory, '');
        data.file = file;
        data.source = data.source || '';
        data.tags = data.tags || '';
        data.notes = data.notes || '';
        data.title = data.title || '';
        imageData[file] = data;
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
  let lastPath = [''];
  ClearChildren(folderView);
  if (leaves.length <= 1) {
    return;
  }
  leaves.sort();

  for (let index = 0; index < leaves.length; index++) {
    let totalPath = leaves[index];
    let folderButton = document.createElement('button');
    let trimmedFolderButtonTextContent = totalPath.replace(rootDirectory + "/", "");
    // console.log('creating', trimmedFolderButtonTextContent)
    let folderHierarchy = trimmedFolderButtonTextContent.split('/');
    // console.log('folderHierarchy', folderHierarchy)
    for (let i = 0; i < folderHierarchy.length; i++) {
      // if (folderHierarchy[i].length > 16) {
      //   folderHierarchy[i] = folderHierarchy[i].substring(0,15) + '…'
      //   console.log('folder name is too long!', folderHierarchy[i])
      // }
    }
    // let folderContainer = null;
    // for (let i = 0; i < folderHierarchy.length - 1; i++) {
    //   if (lastPath.length < i || lastPath[i] !== folderHierarchy[i]) {
    //     folderContainer = document.createElement('div');
    //     let title = document.createElement('h' + Math.max(i + 1, 5));
    //     title.textContent = folderHierarchy[i];
    //     folderContainer.setAttribute('id', folderHierarchy[i]);
    //     folderContainer.appendChild(title);
    //     folderView.appendChild(folderContainer);
    //   }
    // }
    let folderButtonTextContent = folderHierarchy[folderHierarchy.length - 1];

    folderButton.setAttribute('title', trimmedFolderButtonTextContent)
    folderButton.innerText = trimmedFolderButtonTextContent;

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

    let parent = folderView;
    parent.appendChild(folderButton);
    lastPath = folderHierarchy;

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

function LoadImages(currentPath, fileArray) {
  if (currentPath) {
    fs.readdir(currentPath, (err, dir) => {
      if (dir.length <= 0) { return; }

      for (let file of dir) {
        let isImage = file.match(imgFileTypes);
        if (isImage) {
          CreateImage(currentPath, file);
        } else if (file.match(vidFileTypes)) {

        } else if (file.match(txtFileTypes)) {

        }
      }

      console.log('> done loading all images');
    });
  } else if (fileArray.length > 0) {
    console.log(fileArray);
    for (let file of fileArray) {
      CreateImage(rootDirectory + file.path, file.file);
      // let isImage = file.match(imgFileTypes);
      // if (isImage) {
      //   CreateImage(currentPath, file);
      // } else if (file.match(vidFileTypes)) {

      // } else if (file.match(txtFileTypes)) {

      // }
    }
  }
}

function CreateImage(path, file, dropped) {
  let img = new Image();
  let src = path + '/' + file;
  img.src = src;
  img.dataset.index = imageElements.length;
  img.dataset.name = file;
  img.dataset.path = path;
  ResizeImages();
  let container = document.createElement('div');
  container.classList.add('container');
  container.appendChild(img);
  imageView.appendChild(container);
  img.onload = function () {
    img.classList.add('img-loaded');
  }
  if (dropped) {
    img.classList.add('img-loaded');
    edit.show(img);
  }
  img.addEventListener('click', imageEvents, false);
  imageElements.push(img);

  function imageEvents() {
    lightbox.setImg(img);
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
    console.log('loaded data!', imageData);
  }
}

function copyImage(src) {
  if (process.platform === 'win32' && src[0] === '/') {
    src = src.substring(1);
  }
  var copiedImage = nativeImage.createFromPath(src);
  console.log('copying', src, copiedImage);
  clipboard.writeImage(copiedImage);
}

// ~~~~~~~~~ lightbox ~~~~~~~~~

let lightbox = function () {
  let elem = document.getElementById('lightbox');
  let img = document.getElementById('lightboxImg');
  let description = {
    close: elem.querySelector('.close'),
    title: elem.querySelector('.file-name'),
    notes: elem.querySelector('.notes'),
    source: elem.querySelector('.source'),
    edit: elem.querySelector('.edit'),
    copy: elem.querySelector('.copy'),
    secondaryName: elem.querySelector('.secondary-name'),
  }
  let arrowL = document.getElementById('arrow-left');
  let arrowR = document.getElementById('arrow-right');
  let index = 0;
  function hidden() {
    return elem.classList.contains('hidden');
  }

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

    description.edit.addEventListener('click', () => {
      edit.show();
    });
  }
  init();

  function setImg(_img) {
    currentImage = _img;
    img.src = _img.src;
    index = +_img.dataset.index;
    description.title.setAttribute('alt', _img.dataset.name);
    arrowL.style.backgroundImage = 'url("' + imageElements[getIncrementedIndex(-1)].src + '")';
    arrowR.style.backgroundImage = 'url("' + imageElements[getIncrementedIndex(1)].src + '")';
    // console.log(imageData, _img.dataset.name);
    if (imageData[_img.dataset.name]) {
      description.title.textContent = imageData[_img.dataset.name].title || _img.dataset.name;
      if (imageData[_img.dataset.name].title && imageData[_img.dataset.name].title !== _img.dataset.name) {
        description.secondaryName.textContent = _img.dataset.name;
      } else {
        description.secondaryName.textContent = '';
      }
      description.notes.textContent = imageData[_img.dataset.name].notes || '';
      if (imageData[_img.dataset.name].source) {
        let src = imageData[_img.dataset.name].source.replace(/https?:\/\//g, '');
        description.source.textContent = src || '';
      } else {
        description.source.textContent = '';
      }
      description.source.href = imageData[_img.dataset.name].source || '#!';
      description.source.setAttribute('title', imageData[_img.dataset.name].source || '');
    } else {
      description.title.textContent = _img.dataset.name;
      description.notes.textContent = '';
      description.source.textContent = '';
      description.source.href = '#!';
      description.secondaryName.textContent = '';
    }
    lightbox.display(true);
  }

  function increment(amount) {
    // console.log(document.activeElement);
    if (document.activeElement.tagName === 'TEXTAREA' || document.activeElement.tagName === 'INPUT') {
      return;
    }
    let val = getIncrementedIndex(amount);
    setImg(imageElements[val]);
  }

  function getIncrementedIndex(amount) {
    let _index = index + amount;
    if (_index < 0) {
      _index = imageElements.length - 1;
    } else if (_index >= imageElements.length) {
      _index = 0;
    }
    return _index;
  }

  function display(disp) {
    if (disp === false) {
      currentImage = null;
    }
    ToggleSection(elem, !disp);
    PreventScroll(disp);
  }

  return {
    setImg,
    increment,
    display,
    index,
    hidden
  }
}();

// ~~~~~~~~~ edit view ~~~~~~~~~~~~

let edit = function () {
  let elem = {
    view: document.getElementById('edit-image'),
    save: document.getElementById('edit-save'),
    cancel: document.getElementById('edit-cancel'),
    filename: document.getElementById('edit-filename'),
    title: document.getElementById('edit-title'),
    source: document.getElementById('edit-source'),
    tags: document.getElementById('edit-tags'),
    notes: document.getElementById('edit-notes'),
    img: document.getElementById('edit-img'),
    counter: document.getElementById('edit-counter'),
    dateButton: document.getElementById('edit-date-button'),
  }

  elem.cancel.addEventListener('click', hide);
  elem.save.addEventListener('click', saveImageEdits);
  elem.dateButton.addEventListener('click', insertDate);

  function insertDate() {
    let extension = '';
    if (elem.filename.value) {
      let start = elem.filename.value.lastIndexOf('.');
      extension = elem.filename.value.substring(start);
    }
    elem.filename.value = new Date().toISOString().replace(/:/gi, '.') + extension;
  }

  function hidden() {
    return elem.view.classList.contains('hidden');
  }

  function hide() {
    if (lightbox.hidden()) {
      currentImage = null;
    }
    if (!dropzone.attemptUpload()) {
      elem.view.classList.add('hidden');
      hidden = true;
      elem.cancel.blur();
      elem.save.blur();
    }
  }

  function show(_image) {
    if (dropzone.droppedFiles.length > 1) {
      elem.counter.textContent = dropzone.uploadIndex + '/' + dropzone.droppedFiles.length;
    } else {
      elem.counter.textContent = '';
    }
    if (currentImage) {
      _image = currentImage;
    } else {
      currentImage = _image;
    }
    elem.view.classList.remove('hidden');
    elem.img.src = _image.src;
    if (_image.dataset) {
      elem.filename.value = _image.dataset.name;
    } else {
      insertDate();
    }
    if (imageData[_image.dataset.name]) {
      elem.title.value = imageData[_image.dataset.name].title || '';
      elem.notes.value = imageData[_image.dataset.name].notes || '';
      elem.source.value = imageData[_image.dataset.name].source || '';
      elem.tags.value = imageData[_image.dataset.name].tags || '';
    } else {
      elem.title.value = '';
      elem.notes.value = '';
      elem.source.value = '';
      elem.tags.value = '';
    }
    elem.filename.focus();
  }

  function saveImageEdits() {
    let oldFileName = null;
    if (elem.filename.value !== currentImage.dataset.name) {
      let newFileName = (currentImage.dataset.path + '/' + elem.filename.value);
      try {
        fs.accessSync(newFileName, fs.constants.W_OK);
        console.error('file already exists with that name!');
      } catch (err) {
        let toReplace = 'file://';
        if (process.platform === 'win32') {
          toReplace = 'file:///';
        }
        oldFileName = currentImage.src.replace(toReplace, '');
        currentImage.src = newFileName;
        currentImage.dataset.name = elem.filename.value;
        console.log('old name', oldFileName, 'new name', newFileName);
        fs.renameSync(decodeURIComponent(oldFileName), newFileName);
      }

    }

    if (oldFileName && imageData[oldFileName]) {
      imageData[currentImage.dataset.name] = imageData[oldFileName];
      delete imageData[oldFileName];
    }

    if (!imageData[currentImage.dataset.name]) {
      imageData[currentImage.dataset.name] = {};
    }

    imageData[currentImage.dataset.name].title = elem.title.value || '';
    imageData[currentImage.dataset.name].source = elem.source.value || '';
    imageData[currentImage.dataset.name].notes = elem.notes.value || '';
    imageData[currentImage.dataset.name].tags = elem.tags.value || '';
    imageData[currentImage.dataset.name].editTime = new Date().toISOString();


    if (!lightbox.hidden()) {
      lightbox.setImg(currentImage);
    }
    hide();
    saveDb();
  }



  return {
    show,
    hide,
    hidden
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
  // console.log(side);
}

// ~~~~~~~~~ utility functions ~~~~~~~~~

function ResizeImages() {
  // imageView.style.columnCount = options.columns;
  // imageView.style.columnGap = options.gutter + 'px';
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
    if (process.platform === 'win32' && src[0] === '/') {
      src = src.substring(1);
    }

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
        console.log('showing item in folder', src);
        shell.showItemInFolder(src);
      }
    }));

    rightClickMenu.append(new MenuItem({
      label: 'Copy Image',
      click() {
        copyImage(src);
      }
    }));

  }

  rightClickMenu.append(new MenuItem({
    label: 'Paste Image',
    click() {
      let clipImage = clipboard.readImage();
      if (clipImage.isEmpty()) {
        console.warn('Pasted image is empty?');
        // notification({ success: false, name: name, reason: 'pasted image is empty.' });
        return;
      }
      let uploading = clipImage.toPNG();
      console.log(uploading, Buffer.isBuffer(uploading));
      dropzone.upload(uploading);
    }
  }));

  return rightClickMenu;
}

window.addEventListener('contextmenu', (e) => {
  e.preventDefault();
  let target = e.target;
  CreateRightClickMenu(target).popup(remote.getCurrentWindow())
}, false);
