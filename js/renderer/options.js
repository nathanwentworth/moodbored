
const defaults = {
  columns: 3,
  gutter: 6,
  background: '#f1f2f3',
  userStyles: '',
  sidebar: true,
  moveFile: false,
  confirmDelete: true
}

// defaults
module.exports = defaults;

module.exports.elements = {
  menu: document.getElementById('options-menu'),
  columnOptionCtrl: document.getElementById('image-width-ctrl'),
  columnOptionLabel: document.getElementById('image-width-label'),
  gutterOptionCtrl: document.getElementById('gutter-width-ctrl'),
  gutterOptionLabel: document.getElementById('gutter-width-label'),
  backgroundCtrl: document.getElementById('background-ctrl'),
  userStylesCtrl: document.getElementById('user-styles-ctrl'),
  userStylesElem: document.getElementById('user-styles'),
  moveFilesCtrl: document.getElementById('move-files-ctrl'),
  confirmDeleteCtrl: document.getElementById('confirm-delete-ctrl')
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