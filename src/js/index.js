"use strict";
class Task {
  constructor(x, y) {
    this.x = x;
    this.y = y;
  }

  toString() {
    return '(' + this.x + ', ' + this.y + ')';
  }
}

$(".mdui-tab a").on("click", e => {
  $(`.pages`).hide()
  $(`.${e.target.id}`).show()
})

$(".mdui-fab").on("click", e => {
  $("#current-file").trigger("click")
})

$("#current-file").on("change", e => {
  console.log(e.target.files)
  init(e.target.files)

})

if(typeof utools !== "undefined") {
  utools.onPluginEnter(({ code, type, payload }) => {
    if (type !== "files") return
    let payld = [
      {
        isFile: true,
        name: "fileName",
        path: "filePath"
      }
    ]
    init(payload)
  });
}

function init(files) {
  for(let file of files) {
    console.log(file);
    if(checkOverSize(file)) {
      toastr.options = {
        positionClass: "toast-bottom-left",
      }
      toastr.error(`${file.name} 大于10MB`, "FileConverter")
    }
    addNewFile(file)
  }
  // let task = new Task(file)
}

function checkOverSize(file) {
  console.log(file.size);
  if(file.size >= 10485760) {
    console.log("oversize");
    return true
  } else {
    console.log("notoversize");
    return false
  }
}

function addNewFile(file) {
  let dom = /* html */`
    <tr id="${new Date().getTime()}">
      <input type="file" class="file-target" style="display: none;">
      <th class="file-name" title="${file.name}">${file.name}</th>
      <th class="file-type">${file.name.split(".").pop()}</th>
      <th class="file-process">Process</th>
      <th class="file-operate">Operate</th>
    </tr>
  `
  $(".file-table tbody").prepend(dom)
  mdui.updateTables()
}