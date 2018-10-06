
const defaults = {
  columns: 3,
  gutter: 6,
  background: '#f1f2f3',
  userStyles: '',
  sidebar: true,
  sidebarSide: 'left',
  moveFile: false,
  confirmDelete: true
}

// defaults
module.exports = defaults;

module.exports.menu = document.getElementById('options-menu');

module.exports.elements = {
  columns: {
    ctrl: document.getElementById('image-width-ctrl'),
    label: document.getElementById('image-width-label')
  },
  gutter: {
    ctrl: document.getElementById('gutter-width-ctrl'),
    label: document.getElementById('gutter-width-label')
  },
  background: {
    ctrl: document.getElementById('background-ctrl')
  },
  userStyles: {
    ctrl: document.getElementById('user-styles-ctrl'),
    elem: document.getElementById('user-styles')
  },
  moveFiles: {
    ctrl: document.getElementById('move-files-ctrl')
  },
  confirmDelete: {
    ctrl: document.getElementById('confirm-delete-ctrl')
  },
  sidebarSide: {
    ctrl: document.getElementById('sidebar-side-ctrl')
  }
}

module.exports.load = function () {
  let _options = localStorage.getItem('options');
  if (_options != null) {
    _options = JSON.parse(_options);
    console.log("> successfully loaded options");
  } else {
    _options = defaults;
    console.log("> no options saved, going with defaults");
  }

  return _options;
}

module.exports.save = function (o) {
  localStorage.setItem('options', JSON.stringify(o));
  console.log('> saved options');
}