const wpc = window.__PageConfig || {}
/* eslint-disable react/no-string-refs */
/* eslint-disable react/prop-types */
// ~~ 数据列表
const COLUMN_MIN_WIDTH = 30
class RbList extends React.Component {
  constructor(props) {
    super(props)

    this.__defaultFilterKey = 'AdvFilter-' + this.props.config.entity
    this.__sortFieldKey = 'SortField-' + this.props.config.entity
    this.__columnWidthKey = 'ColumnWidth-' + this.props.config.entity + '.'

    let sort = ($storage.get(this.__sortFieldKey) || ':').split(':')
    let fields = props.config.fields
    for (let i = 0; i < fields.length; i++) {
      let cw = $storage.get(this.__columnWidthKey + fields[i].field)
      if (!!cw && ~~cw >= COLUMN_MIN_WIDTH) fields[i].width = ~~cw
      if (sort[0] === fields[i].field) fields[i].sort = sort[1]
    }
    props.config.fields = null
    this.state = { ...props, fields: fields, rowsData: [], pageNo: 1, pageSize: 20, inLoad: true, checkedAll: false }

    this.__defaultColumnWidth = $('#react-list').width() / 10
    if (this.__defaultColumnWidth < 130) this.__defaultColumnWidth = 130

    this.pageNo = 1
    this.pageSize = $storage.get('ListPageSize') || 20
    this.advFilter = $storage.get(this.__defaultFilterKey)

    this.toggleAllRow = this.toggleAllRow.bind(this)
  }
  render() {
    let that = this
    const lastIndex = this.state.fields.length
    return (
      <div>
        <div className="row rb-datatable-body">
          <div className="col-sm-12">
            <div className="rb-scroller" ref="rblist-scroller">
              <table className="table table-hover table-striped">
                <thead>
                  <tr>
                    <th className="column-checkbox">
                      <div><label className="custom-control custom-control-sm custom-checkbox"><input className="custom-control-input" type="checkbox" checked={this.state.checkedAll} onClick={this.toggleAllRow} /><span className="custom-control-label"></span></label></div>
                    </th>
                    {this.state.fields.map((item) => {
                      let cWidth = (item.width || that.__defaultColumnWidth)
                      let styles = { width: cWidth + 'px' }
                      let sortClazz = item.sort || ''
                      return (<th key={'column-' + item.field} style={styles} className="sortable unselect" onClick={this.sortField.bind(this, item.field)}><div style={styles}><span style={{ width: (cWidth - 8) + 'px' }}>{item.label}</span><i className={'zmdi ' + sortClazz}></i><i className="split" data-field={item.field}></i></div></th>)
                    })}
                    <th className="column-empty"></th>
                  </tr>
                </thead>
                <tbody>
                  {this.state.rowsData.map((item, index) => {
                    let lastGhost = item[lastIndex]
                    let rowKey = 'row-' + lastGhost[0]
                    return (<tr key={rowKey} className={lastGhost[3] ? 'table-active' : ''} onClick={this.clickRow.bind(this, index, false)}>
                      <td key={rowKey + '-checkbox'} className="column-checkbox">
                        <div><label className="custom-control custom-control-sm custom-checkbox"><input className="custom-control-input" type="checkbox" checked={lastGhost[3]} onClick={this.clickRow.bind(this, index, true)} /><span className="custom-control-label"></span></label></div>
                      </td>
                      {item.map((cell, index) => {
                        return that.renderCell(cell, index, lastGhost)
                      })}
                      <td className="column-empty"></td>
                    </tr>)
                  })}
                </tbody>
              </table>
              {this.state.inLoad === false && this.state.rowsData.length === 0 ? <div className="list-nodata"><span className="zmdi zmdi-info-outline" /><p>暂无数据</p></div> : null}
            </div>
          </div></div>
        {this.state.rowsData.length > 0 ? <RbListPagination ref="pagination" rowsTotal={this.state.rowsTotal} pageSize={this.pageSize} $$$parent={this} /> : null}
        {this.state.inLoad === true && <RbSpinner />}
      </div>)
  }
  componentDidMount() {
    const scroller = $(this.refs['rblist-scroller'])
    scroller.perfectScrollbar()

    let that = this
    scroller.find('th .split').draggable({
      containment: '.rb-datatable-body', axis: 'x', helper: 'clone', stop: function (event, ui) {
        let field = $(event.target).data('field')
        let left = ui.position.left - 2
        if (left < COLUMN_MIN_WIDTH) left = COLUMN_MIN_WIDTH
        let fields = that.state.fields
        for (let i = 0; i < fields.length; i++) {
          if (fields[i].field === field) {
            fields[i].width = left
            $storage.set(that.__columnWidthKey + field, left)
            break
          }
        }
        that.setState({ fields: fields })
      }
    })
    this.fetchList()
  }
  componentDidUpdate() {
    let that = this
    this.__selectedRows = []
    this.state.rowsData.forEach((item) => {
      let lastGhost = item[that.state.fields.length]
      if (lastGhost[3] === true) that.__selectedRows.push(lastGhost)
    })

    let oper = $('.dataTables_oper')
    oper.find('.J_delete, .J_view, .J_edit').attr('disabled', true)
    let len = this.__selectedRows.length
    if (len > 0) oper.find('.J_delete').attr('disabled', false)
    if (len === 1) oper.find('.J_view, .J_edit').attr('disabled', false)
  }

  fetchList(filter) {
    let fields = []
    let field_sort = null
    this.state.fields.forEach(function (item) {
      fields.push(item.field)
      if (item.sort) field_sort = item.field + ':' + item.sort.replace('sort-', '')
    })

    let entity = this.props.config.entity
    this.lastFilter = filter || this.lastFilter
    let query = {
      entity: entity,
      fields: fields,
      pageNo: this.pageNo,
      pageSize: this.pageSize,
      filter: this.lastFilter,
      advFilter: this.advFilter,
      sort: field_sort,
      reload: this.pageNo === 1
    }

    let loadingTimer = setTimeout(() => {
      this.setState({ inLoad: true })
      $('#react-list').addClass('rb-loading-active')
    }, 400)
    $.post(`${rb.baseUrl}/app/${entity}/data-list`, JSON.stringify(query), (res) => {
      if (res.error_code === 0) {
        let rowsdata = res.data.data || []
        if (rowsdata.length > 0) {
          let lastIndex = rowsdata[0].length - 1
          rowsdata = rowsdata.map((item) => {
            item[lastIndex][3] = false  // Checked?
            return item
          })
        }

        this.setState({ rowsData: rowsdata, inLoad: false })
        if (res.data.total > 0) this.refs['pagination'].setState({ rowsTotal: res.data.total })

      } else {
        rb.hberror(res.error_msg)
      }

      clearTimeout(loadingTimer)
      $('#react-list').removeClass('rb-loading-active')
    })
  }

  // 渲染表格及相关事件处理

  renderCell(cellVal, index, lastGhost) {
    if (this.state.fields.length === index) return null
    const field = this.state.fields[index]
    if (!field) return null

    const cellKey = 'row-' + lastGhost[0] + '-' + index
    if (!cellVal) {
      return <td key={cellKey}><div></div></td>
    } else if (cellVal === '$NOPRIVILEGES$') {
      return <td key={cellKey}><div className="column-nopriv" title="你无权读取此项数据">[无权限]</div></td>
    } else {
      let w = this.state.fields[index].width || this.__defaultColumnWidth
      let t = field.type
      if (field.field === this.props.config.nameField) {
        cellVal = lastGhost
        t = '$NAME$'
      }
      return CellRenders.render(cellVal, t, w, cellKey + '.' + field.field)
    }
  }

  toggleAllRow() {
    let checked = this.state.checkedAll === false
    let rowsdata = this.state.rowsData
    rowsdata = rowsdata.map((item) => {
      item[item.length - 1][3] = checked  // Checked?
      return item
    })
    this.setState({ checkedAll: checked, rowsData: rowsdata })
    return false
  }
  clickRow(rowIndex, holdOthers, e) {
    if (e.target.tagName === 'SPAN') return false
    e.stopPropagation()
    e.nativeEvent.stopImmediatePropagation()

    let rowsdata = this.state.rowsData
    let lastIndex = rowsdata[0].length - 1
    if (holdOthers === true) {
      let item = rowsdata[rowIndex]
      item[lastIndex][3] = item[lastIndex][3] === false  // Checked?
      rowsdata[rowIndex] = item
    } else {
      rowsdata = rowsdata.map((item, index) => {
        item[lastIndex][3] = index === rowIndex
        return item
      })
    }
    this.setState({ rowsData: rowsdata })
    return false
  }

  sortField(field, e) {
    let fields = this.state.fields
    for (let i = 0; i < fields.length; i++) {
      if (fields[i].field === field) {
        if (fields[i].sort === 'sort-asc') fields[i].sort = 'sort-desc'
        else fields[i].sort = 'sort-asc'
        $storage.set(this.__sortFieldKey, field + ':' + fields[i].sort)
      } else {
        fields[i].sort = null
      }
    }
    let that = this
    this.setState({ fields: fields }, function () {
      that.fetchList()
    })

    e.stopPropagation()
    e.nativeEvent.stopImmediatePropagation()
    return false
  }

  // 外部接口

  setPage(pageNo, pageSize) {
    this.pageNo = pageNo || this.pageNo
    if (pageSize) {
      this.pageSize = pageSize
      $storage.set('ListPageSize', pageSize)
    }
    this.fetchList()
  }

  setAdvFilter(id) {
    this.advFilter = id
    this.fetchList()

    if (id) $storage.set(this.__defaultFilterKey, id)
    else $storage.remove(this.__defaultFilterKey)
  }

  getSelectedRows() {
    return this.__selectedRows
  }
  getSelectedIds() {
    if (!this.__selectedRows || this.__selectedRows.length < 1) { rb.highbar('未选中任何记录'); return [] }
    let ids = this.__selectedRows.map((item) => { return item[0] })
    return ids
  }

  search(filter, fromAdv) {
    let afHold = this.advFilter
    if (fromAdv === true) this.advFilter = null
    this.fetchList(filter)

    // Not keep last filter
    if (fromAdv === true) {
      this.advFilter = afHold
      this.lastFilter = null
    }
  }
  reload() {
    this.fetchList()
  }
}

// 列表（单元格）渲染
var CellRenders = {
  __renders: {},
  addRender(type, func) {
    this.__renders[type] = func
  },
  clickView(v) {
    rb.RbViewModal({ id: v[0], entity: v[2][0] })
    return false
  },
  render(value, type, width, key) {
    let style = { width: (width || COLUMN_MIN_WIDTH) + 'px' }
    let func = this.__renders[type]
    if (func) return func(value, style, key)
    else return <td key={key}><div style={style}>{value}</div></td>
  }
}
CellRenders.addRender('$NAME$', function (v, s, k) {
  return <td key={k}><div style={s}><a href={'#!/View/' + v[2][0] + '/' + v[0]} onClick={() => CellRenders.clickView(v)} className="column-main">{v[1]}</a></div></td>
})
CellRenders.addRender('IMAGE', function (v, s, k) {
  v = JSON.parse(v || '[]')
  return <td key={k} className="td-min">
    <div style={s} className="column-imgs" title={v.length + ' 个图片'}>
      {v.map((item) => {
        let imgUrl = rb.baseUrl + '/filex/img/' + item
        let imgName = $fileCutName(item)
        return <a key={'k-' + item} href={'#!/Preview/' + item} title={imgName}><img src={imgUrl + '?imageView2/2/w/100/interlace/1/q/100'} /></a>
      })}</div></td>
})
CellRenders.addRender('FILE', function (v, s, k) {
  v = JSON.parse(v || '[]')
  return <td key={k} className="td-min"><div style={s} className="column-files">
    <ul className="list-unstyled" title={v.length + ' 个文件'}>
      {v.map((item) => {
        let fileName = $fileCutName(item)
        return <li key={'k-' + item} className="text-truncate"><a href={'#!/Preview/' + item} title={fileName}>{fileName}</a></li>
      })}</ul>
  </div></td>
})
CellRenders.addRender('REFERENCE', function (v, s, k) {
  return <td key={k}><div style={s}><a href={'#!/View/' + v[2][0] + '/' + v[0]} onClick={() => CellRenders.clickView(v)}>{v[1]}</a></div></td>
})
CellRenders.addRender('URL', function (v, s, k) {
  return <td key={k}><div style={s}><a href={rb.baseUrl + '/common/url-safe?url=' + $encode(v)} className="column-url" target="_blank" rel="noopener noreferrer">{v}</a></div></td>
})
CellRenders.addRender('EMAIL', function (v, s, k) {
  return <td key={k}><div style={s}><a href={'mailto:' + v} className="column-url">{v}</a></div></td>
})
CellRenders.addRender('AVATAR', function (v, s, k) {
  let imgUrl = rb.baseUrl + '/filex/img/' + v + '?imageView2/2/w/100/interlace/1/q/100'
  return <td key={k} className="user-avatar"><img src={imgUrl} alt="Avatar" /></td>
})

// 分页组件
class RbListPagination extends React.Component {
  constructor(props) {
    super(props)
    this.state = { ...props }

    this.state.pageNo = this.state.pageNo || 1
    this.state.pageSize = this.state.pageSize || 20
    this.state.rowsTotal = this.state.rowsTotal || 0
  }
  render() {
    this.__pageTotal = Math.ceil(this.state.rowsTotal / this.state.pageSize)
    if (this.__pageTotal <= 0) this.__pageTotal = 1
    let pages = this.__pageTotal <= 1 ? [1] : $pages(this.__pageTotal, this.state.pageNo)
    return (
      <div className="row rb-datatable-footer">
        <div className="col-12 col-md-4">
          <div className="dataTables_info" key="page-rowsTotal">{this.state.rowsTotal > 0 ? `共 ${this.state.rowsTotal} 条数据` : ''}</div>
        </div>
        <div className="col-12 col-md-8">
          <div className="float-right paging_sizes">
            <select className="form-control form-control-sm" title="每页显示" onChange={this.setPageSize} value={this.state.pageSize || 20}>
              {rb.env === 'dev' && <option value="5">5 条</option>}
              <option value="20">20 条</option>
              <option value="40">40 条</option>
              <option value="80">80 条</option>
              <option value="100">100 条</option>
              <option value="200">200 条</option>
            </select>
          </div>
          <div className="float-right dataTables_paginate paging_simple_numbers">
            <ul className="pagination">
              {this.state.pageNo > 1 && <li className="paginate_button page-item"><a className="page-link" onClick={() => this.prev()}><span className="icon zmdi zmdi-chevron-left"></span></a></li>}
              {pages.map((item) => {
                if (item === '.') return <li key={'page-' + item} className="paginate_button page-item disabled"><a className="page-link">...</a></li>
                else return <li key={'page-' + item} className={'paginate_button page-item ' + (this.state.pageNo === item && 'active')}><a className="page-link" onClick={this.goto.bind(this, item)}>{item}</a></li>
              })}
              {this.state.pageNo !== this.__pageTotal && <li className="paginate_button page-item"><a className="page-link" onClick={() => this.next()}><span className="icon zmdi zmdi-chevron-right"></span></a></li>}
            </ul>
          </div>
          <div className="clearfix" />
        </div>
      </div>
    )
  }
  prev() {
    if (this.state.pageNo === 1) return
    this.goto(this.state.pageNo - 1)
  }
  next() {
    if (this.state.pageNo === this.__pageTotal) return
    this.goto(this.state.pageNo + 1)
  }
  goto(pageNo) {
    this.setState({ pageNo: pageNo }, () => {
      this.props.$$$parent.setPage(this.state.pageNo)
    })
  }
  setPageSize = (e) => {
    let s = e.target.value
    this.setState({ pageSize: s }, () => {
      this.props.$$$parent.setPage(1, s)
    })
  }
}

// -- Usage

var rb = rb || {}

// @props = { config }
rb.RbList = function (props, target) {
  return renderRbcomp(<RbList {...props} />, target || 'react-list')
}

// 列表页面初始化
const RbListPage = {
  _RbList: null,

  // @config - List config
  // @entity - [Name, Label, Icon]
  // @ep - Privileges of this entity
  init: function (config, entity, ep) {
    this._RbList = renderRbcomp(<RbList config={config} />, 'react-list')

    const that = this

    $('.J_new').click(() => {
      rb.RbFormModal({ title: `新建${entity[1]}`, entity: entity[0], icon: entity[2] })
    })
    $('.J_edit').click(() => {
      let ids = this._RbList.getSelectedIds()
      if (ids.length >= 1) {
        rb.RbFormModal({ id: ids[0], title: `编辑${entity[1]}`, entity: entity[0], icon: entity[2] })
      }
    })
    $('.J_delete').click(() => {
      let ids = this._RbList.getSelectedIds()
      if (ids.length < 1) return
      let deleteAfter = function () {
        that._RbList.reload()
      }
      const needEntity = (wpc.type === 'SlaveList' || wpc.type === 'SlaveView') ? null : entity[0]
      renderRbcomp(<DeleteConfirm ids={ids} entity={needEntity} deleteAfter={deleteAfter} />)
    })
    $('.J_view').click(() => {
      let ids = this._RbList.getSelectedIds()
      if (ids.length >= 1) {
        location.hash = '!/View/' + entity[0] + '/' + ids[0]
        rb.RbViewModal({ id: ids[0], entity: entity[0] })
      }
    })
    $('.J_assign').click(() => {
      let ids = this._RbList.getSelectedIds()
      if (ids.length > 0) rb.DlgAssign({ entity: entity[0], ids: ids })
    })
    $('.J_share').click(() => {
      let ids = this._RbList.getSelectedIds()
      if (ids.length > 0) rb.DlgShare({ entity: entity[0], ids: ids })
    })
    $('.J_unshare').click(() => {
      let ids = this._RbList.getSelectedIds()
      if (ids.length > 0) rb.DlgUnshare({ entity: entity[0], ids: ids })
    })

    $('.J_columns').click(function () {
      rb.modal(`${rb.baseUrl}/p/general-entity/show-fields?entity=${entity[0]}`, '设置列显示')
    })

    // Privileges
    if (ep) {
      if (ep.C === false) $('.J_new').remove()
      if (ep.D === false) $('.J_delete').remove()
      if (ep.U === false) $('.J_edit').remove()
      if (ep.A === false) $('.J_assign').remove()
      if (ep.S === false) $('.J_share, .J_unshare').remove()

      $cleanMenu('.J_action')
    }

    this.initQuickFilter(entity[0])
  },

  initQuickFilter: function (e) {
    let btn = $('.input-search .btn'),
      input = $('.input-search input')
    btn.click(() => {
      let q = $val(input)
      let filterExp = { entity: e, type: 'QUICK', values: { 1: q }, qfields: $('.input-search').data('qfields') }
      this._RbList.search(filterExp)
    })
    input.keydown((event) => { if (event.which === 13) btn.trigger('click') })
  }
}

// 列表高级查询
const AdvFilters = {

  // @el - 控件
  // @entity - 实体
  init(el, entity) {
    this.__el = $(el)
    this.__entity = entity

    this.__el.find('.J_advfilter').click(() => { this.showAdvFilter(null, this.current) })
    // $ALL$
    $('.adv-search .dropdown-item:eq(0)').click(() => {
      $('.adv-search .J_name').text('全部数据')
      RbListPage._RbList.setAdvFilter(null)
    })

    this.loadFilters()
  },

  loadFilters() {
    let dFilter = $storage.get(RbListPage._RbList.__defaultFilterKey)
    let that = this
    $.get(`${rb.baseUrl}/app/${this.__entity}/advfilter/list`, function (res) {
      $('.adv-search .J_custom').each(function () { $(this).remove() })

      $(res.data).each(function () {
        const _data = this
        let item = $('<div class="dropdown-item J_custom" data-id="' + _data.id + '"><a class="text-truncate">' + _data.name + '</a></div>').appendTo('.adv-search .dropdown-menu')
        item.click(function () {
          $('.adv-search .J_name').text(_data.name)
          RbListPage._RbList.setAdvFilter(_data.id)
          that.current = _data.id
        })
        if (dFilter === _data.id) {
          $('.adv-search .J_name').text(_data.name)
          that.current = _data.id
        }

        // 可修改
        if (_data.editable) {
          let action = $('<div class="action"><a title="修改"><i class="zmdi zmdi-edit"></i></a><a title="删除"><i class="zmdi zmdi-delete"></i></a></div>').appendTo(item)
          action.find('a:eq(0)').click(function () {
            that.showAdvFilter(_data.id)
            $('.adv-search .btn.dropdown-toggle').dropdown('toggle')
            return false
          })
          action.find('a:eq(1)').click(function () {
            rb.alert('确认删除此查询项吗？', {
              type: 'danger',
              confirm: function () {
                this.disabled(true)
                $.post(`${rb.baseUrl}/app/entity/record-delete?id=${_data.id}`, (res) => {
                  if (res.error_code === 0) {
                    this.hide()
                    that.loadFilters()
                    if (dFilter === _data.id) {
                      RbListPage._RbList.setAdvFilter(null)
                      $('.adv-search .J_name').text('全部数据')
                    }
                  } else rb.hberror(res.error_msg)
                })
              }
            })
            return false
          })
        }
      })
    })
  },

  showAdvFilter(id, copyId) {
    let props = { entity: this.__entity, inModal: true, fromList: true, confirm: this.saveFilter }
    if (!id) {
      if (this.__customAdv) this.__customAdv.show()
      else {
        if (copyId) {
          this.__getFilter(copyId, (res) => {
            this.__customAdv = renderRbcomp(<AdvFilter {...props} filter={res.filter} />)
          })
        } else {
          this.__customAdv = renderRbcomp(<AdvFilter {...props} />)
        }
      }
    } else {
      this.current = id
      this.__getFilter(id, (res) => {
        renderRbcomp(<AdvFilter {...props} title="修改查询条件" filter={res.filter} filterName={res.name} shareToAll={res.shareTo === 'ALL'} />)
      })
    }
  },

  saveFilter(filter, name, toAll) {
    if (!filter) return
    let _this = AdvFilters
    let url = `${rb.baseUrl}/app/${_this.__entity}/advfilter/post?id=${_this.current || ''}&toAll=${toAll}`
    if (name) url += '&name=' + $encode(name)
    $.post(url, JSON.stringify(filter), (res) => {
      if (res.error_code === 0) _this.loadFilters()
      else rb.hberror(res.error_msg)
    })
  },

  __getFilter(id, call) {
    $.get(`${rb.baseUrl}/app/entity/advfilter/get?id=${id}`, (res) => {
      call(res.data)
    })
  }
}

// Init
$(document).ready(() => {
  if (wpc.entity) {
    RbListPage.init(wpc.listConfig, wpc.entity, wpc.privileges)
    if (!(wpc.advFilter === false)) AdvFilters.init('.adv-search', wpc.entity[0])
  }
})

// -- for View

const VIEW_LOAD_DELAY = 200  // 0.2s in rb-page.css '.rbview.show .modal-content'
//~~ 视图窗口（右侧滑出）
class RbViewModal extends React.Component {
  constructor(props) {
    super(props)
    this.state = { ...props, inLoad: true, isHide: true, isDestroy: false }
    this.mcWidth = this.props.subView === true ? 1170 : 1220
    if ($(window).width() < 1280) this.mcWidth -= 100
  }
  render() {
    return (this.state.isDestroy === true ? null :
      <div className="modal-warpper">
        <div className="modal rbview" ref={(c) => this._rbview = c}>
          <div className="modal-dialog">
            <div className="modal-content" style={{ width: this.mcWidth + 'px' }}>
              <div className={'modal-body iframe rb-loading ' + (this.state.inLoad === true && 'rb-loading-active')}>
                <iframe ref={(c) => this._iframe = c} className={this.state.isHide ? 'invisible' : ''} src={this.state.showAfterUrl || 'about:blank'} frameBorder="0" scrolling="no"></iframe>
                <RbSpinner />
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }
  componentDidMount() {
    let root = $(this._rbview)
    const rootWarp = root.parent().parent()
    let mc = root.find('.modal-content')
    let that = this
    root.on('hidden.bs.modal', function () {
      mc.css({ 'margin-right': -1500 })
      that.setState({ inLoad: true, isHide: true })

      // 如果还有其他 rbview 处于 open 态， 则保持 modal-open
      if ($('.rbview.show').length > 0) {
        $(document.body).addClass('modal-open').css({ 'padding-right': 17 })
      } else {
        location.hash = '!/View/'
      }
      // subView always dispose
      if (that.state.disposeOnHide === true) {
        root.modal('dispose')
        that.setState({ isDestroy: true }, function () {
          rb.__subViewModals[that.state.id] = null
          $unmount(rootWarp)
          // 刷新主实体窗口
          // 打开的子View窗口数据发生了变化（如删除/更新）
          if (rb.subViewChanged && rb.__currentViewModal) {
            rb.__currentViewModal._iframe.contentWindow.RbViewPage.reload()
            rb.subViewChanged = false
          }
        })
      }

    }).on('shown.bs.modal', function () {
      mc.css('margin-right', 0)
      if (that.__urlChanged === false) {
        let cw = mc.find('iframe')[0].contentWindow
        if (cw.RbViewPage && cw.RbViewPage._RbViewForm) cw.RbViewPage._RbViewForm.showAgain(that)
        this.__urlChanged = true
      }

      let mcs = $('body>.modal-backdrop.show')
      if (mcs.length > 1) {
        mcs.addClass('o')
        mcs.eq(0).removeClass('o')
      }
    })
    this.show()
  }
  hideLoading() {
    this.setState({ inLoad: false, isHide: false })
  }
  showLoading() {
    this.setState({ inLoad: true, isHide: true })
  }
  show(url, ext) {
    let urlChanged = true
    if (url && url === this.state.url) urlChanged = false
    ext = ext || {}
    url = url || this.state.url
    this.__urlChanged = urlChanged
    this.setState({ ...ext, url: url, inLoad: urlChanged, isHide: urlChanged }, () => {
      $(this._rbview).modal({ show: true, backdrop: true, keyboard: false })
      setTimeout(() => {
        this.setState({ showAfterUrl: this.state.url })
      }, VIEW_LOAD_DELAY)
    })
  }
  hide() {
    let root = $(this._rbview)
    root.modal('hide')
  }
}

rb.subViewChanged = false
// 主View
rb.__currentViewModal
// 子View（允许多个，ID为Key）
rb.__subViewModals = {}
// @props - { id, entity }
// @subView - 是否子 View
rb.RbViewModal = function (props, subView) {
  const viewUrl = `${rb.baseUrl}/app/${props.entity}/view/${props.id}`
  if (subView === true) {
    rb.RbViewModalHide(props.id)
    let m = renderRbcomp(<RbViewModal url={viewUrl} disposeOnHide={true} id={props.id} subView={true} />)
    rb.__subViewModals[props.id] = m
    return m
  }

  if (rb.__currentViewModal) rb.__currentViewModal.show(viewUrl)
  else rb.__currentViewModal = renderRbcomp(<RbViewModal url={viewUrl} />)
  rb.__subViewModals[props.id] = rb.__currentViewModal
  return rb.__currentViewModal
}

rb.RbViewModalGet = function (id) {
  return rb.__subViewModals[id]
}
rb.RbViewModalHide = function (id) {
  if (!id) {
    if (rb.__currentViewModal) rb.__currentViewModal.hide()
  } else {
    let c = rb.__subViewModals[id]
    if (c) {
      c.hide()
      rb.__subViewModals[id] = null
    }
  }
}

$(window).on('load', () => {
  // 自动打开 View
  let viewHash = location.hash
  if (viewHash && viewHash.startsWith('#!/View/') && (wpc.type === 'RecordList' || wpc.type === 'SlaveList')) {
    viewHash = viewHash.split('/')
    if (viewHash.length === 4 && viewHash[3].length === 20) {
      setTimeout(() => {
        rb.RbViewModal({ entity: viewHash[2], id: viewHash[3] })
      }, 500)
    }
  }
})