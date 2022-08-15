let fileObjects = {}

$('.mdui-tab a').click(() => {
  // 监听导航切换 更新视图
  $('#config-filename input').val(utools.dbStorage.getItem('config-filename'))
  $('#config-silence input')[0].checked = utools.dbStorage.getItem('config-silence')
})

$('.config')
  .on('click', (e) => {
    console.log(e)
    switch (e.currentTarget.id) {
      case 'config-path':
        let newpath = utools.showOpenDialog({
          title: '设置路径',
          defaultPath: utools.getPath('downloads'),
          buttonLabel: '选择',
          properties: ['openDirectory', 'createDirectory', 'promptToCreate']
        })
        if (!newpath) break
        utools.dbStorage.setItem('config-path', newpath)
        break
      case 'config-restore':
        const isConfirm = window.confirm('设置即将重置')
        if (isConfirm) window.restoreConfig()
        break
    }
  })
  .on('change', (e) => {
    switch (e.currentTarget.id) {
      case 'config-filename':
        utools.dbStorage.setItem('config-filename', e.target.value)
        break
      case 'config-silence':
        utools.dbStorage.setItem('config-silence', e.target.checked)
        break
    }
  })

$('.transfer-trigger').on('click', (e) => {
  for (let i = 0; i < $(`tbody > tr`).length; i++) {
    let item = $(`tbody > tr`)[i]
    if (
      item.childNodes[7].innerText.indexOf('上传') === -1 &&
      item.childNodes[7].innerText.indexOf('转换完毕') === -1 &&
      item.childNodes[7].innerText.indexOf('下载中') === -1 &&
      item.childNodes[7].innerText.indexOf('下载完成') === -1
    ) {
      // uploaded and file type selected
      let fileObj = fileObjects[item.id]
      fileObj.output_type = item.childNodes[7].innerText
      executeTransfer(fileObj)
    }
  }
  $('.transfer-trigger').hide()
})

function init(file) {
  if (overSize(file)) {
    toastr.options = { positionClass: 'toast-bottom-left' }
    toastr.error(`${file.name} 大于20MB`, 'FileConverter')
    return
  }
  let fileObj = constructFileObject(file)
  fileObjects[`${fileObj.id}`] = fileObj
  updateTable(fileObj)
  getExtOutput(fileObj).then((data) => {
    appendExtInfo(fileObj, data)
    updateTable(fileObj)
    $('.transfer-trigger').show()
  })
}

function updateTable(fileObj) {
  if (document.querySelectorAll(`#${fileObj.id}`).length !== 0) {
    $(`#${fileObj.id} > .file-status`).html(fileObj.status)
  } else {
    const dom = /* html */ `
        <tr class="file-object" id="${fileObj.id}">
          <th class="file-name" title="${fileObj.name}">${fileObj.name}</th>
          <th class="file-type">${fileObj.ext}</th>
          <th class="file-time">${fileObj.time}</th>
          <td class="file-status"></td>
        </tr>
      `
    $('.file-table tbody').prepend(dom)
    mdui.updateTables()
  }
  mdui.mutation()
}
