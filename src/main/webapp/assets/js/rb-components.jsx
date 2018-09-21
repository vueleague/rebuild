// ~~!v1.0 弹出窗口
class RbModal extends React.Component {
    constructor(props) {
        super(props)
        this.state = { ...props, inLoad: true, isDestroy: false }
    }
	render() {
		return (this.state.isDestroy == true ? null :
			<div className="modal rbmodal colored-header colored-header-primary" ref="rbmodal">
		        <div className="modal-dialog" style={{ maxWidth:(this.props.width || 680) + 'px' }}>
    		        <div className="modal-content">
        		        <div className="modal-header modal-header-colored">
            		        <h3 className="modal-title">{this.state.title || ''}</h3>
            		        <button className="close md-close" type="button" onClick={()=>this.hide()}><span className="zmdi zmdi-close"></span></button>
            		    </div>
            		    <div className={'modal-body rb-loading ' + (this.state.inLoad == true && 'rb-loading-active') + ' ' + (this.state.url && 'iframe')}  ref="rbmodal.body">
            		        {this.props.children || <iframe src={this.state.url || 'about:blank'} frameborder="0" scrolling="no" ref="rbmodal.iframe" onLoad={()=>this.loaded()} onResize={()=>this.loaded()}></iframe>}
                            <RbSpinner />
                        </div>
    		        </div>
		        </div>
			</div>
		)
	}
	componentDidMount() {
	    // if (this.props.children) this.setState({ inLoad: false })
    }
    loaded() {
        if (!!!this.state.url) {
            return
        }
        let that = this;
        $setTimeout(function(){
            let iframe = $(that.refs['rbmodal.iframe'])
            let height = iframe.contents().find('body .main-content').height()
            if (height == 0) height = iframe.contents().find('body').height()
            else height += 45;  // .main-content's padding
            $(that.refs['rbmodal.body']).height(height)
            that.setState({ inLoad: false })
        }, 100, 'RbModal-resize')
    }
	show(state, callback) {
	    if (!!state) state = { ...state, isDestroy: false }
	    else state = { isDestroy: false }
	    let that = this
	    this.setState(state, function(){
            $(that.refs['rbmodal']).modal({ show: true, backdrop: 'static' })
            typeof callback == 'function' && callback(that)
        })
    }
    hide(){
        let root = $(this.refs['rbmodal']);
        root.modal('hide')
        let d = true
        if (this.props.destroyOnHide == false) d = false
        this.setState({ isDestroy: d, inLoad: d  }, function(){
        })
    }
}

class RbAlter extends React.Component {
    constructor(props) {
       super(props)
    }
    render() {
        return (
            <div className="modal rbalter" ref="rbalter">
                <div className="modal-dialog">
                    <div className="modal-content">
                        <div className="modal-header">
                            <button className="close" type="button" onClick={()=>this.hide()}><span className="zmdi zmdi-close"></span></button>
                        </div>
                        <div className="modal-body">
                            <div className="text-center">
                                <h3>{this.props.title || '提示'}</h3>
                                <p>{this.props.message || '提示内容'}</p>
                                <div class="mt-8">
                                    <button className="btn btn-secondary" type="button" onClick={()=>this.hide()}>确定</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        )
    }
    componentDidMount() {
    }
    hide() {
        $(this.refs['rbalter']).parent().remove();
    }
}

class RbNotice extends React.Component {
    constructor(props) {
       super(props)
       this.state = { animatedClass: 'slideInDown' }
    }
    render() {
        let icon = this.props.type == 'success' ? 'check' : 'info-outline'
        icon = this.props.type == 'danger' ? 'close-circle-o' : icon
        let content = !!this.props.htmlMessage ? <div className="message" dangerouslySetInnerHTML={{ __html : this.props.htmlMessage }}></div> : <div className="message">{this.props.message}</div>
        return (<div ref="rbnotice" className={'rbnotice animated faster ' + this.state.animatedClass}>
            <div className={'alert alert-dismissible alert-' + (this.props.type || 'warning')}>
                <button className="close" type="button" onClick={()=>this.close()}><span className="zmdi zmdi-close"></span></button>
                <div className="icon"><span className={'zmdi zmdi-' + icon}></span></div>
                {content}
        </div></div>)
    }
    componentDidMount() {
        if (this.props.closeAuto == false) return
        let that = this
        setTimeout(function(){
            that.close()
        }, that.props.timeout || 3000)
    }
    close() {
        let that = this
        this.setState({ animatedClass: 'fadeOut' }, function(){
            setTimeout(function(){
                $(that.refs['rbnotice']).parent().remove();
            }, 1000)
        })
    }
}

function RbSpinner(props) {
    return <div className="rb-spinner">
        <svg width="40px" height="40px" viewBox="0 0 66 66" xmlns="http://-www.w3.org/2000/svg">
            <circle fill="none" stroke-width="4" stroke-linecap="round" cx="33" cy="33" r="30" class="circle"></circle>
        </svg>
    </div>
}

let renderRbcompTimes = 1;
const renderRbcomp = function(jsx, target) {
    target = target || ('react-comps-' + new Date().getTime()) + '-' + renderRbcompTimes++;
    let container = $('#' + target);
    if (container.length == 0) container = $('<div id="' + target + '"></div>').appendTo(document.body);
    return ReactDOM.render(jsx, container[0]);
};

var rb = rb || {}
rb.notice = function(message, type, exts){
    if (top != self && parent.rb && parent.rb.notice){
        parent.rb.notice(message, type, exts)
        return;
    }
    
    exts = exts || {}
    if (exts.html == true) return renderRbcomp(<RbNotice htmlMessage={message} type={type} timeout={exts.timeout} />)
    else renderRbcomp(<RbNotice message={message} type={type} timeout={exts.timeout} />)
}
rb.alter = function(message, title){
    renderRbcomp(<RbAlter message={message} title={title} />)
}
rb.modal = function(url, title, exts) {
    exts = exts || {}
    const comp = renderRbcomp(<RbModal url={url} title={title} width={exts.width} destroyOnHide={exts.destroyOnHide === false ? false : true } />)
    comp.show()
    return comp
}