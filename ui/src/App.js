import React, {PropTypes} from 'react'
import {connect} from 'react-redux'
import {bindActionCreators} from 'redux'

import SideNav from 'src/side_nav'
import Notifications from 'shared/components/Notifications'

import {publishNotification} from 'src/shared/actions/notifications'

const {func, node} = PropTypes

const App = React.createClass({
  propTypes: {
    children: node.isRequired,
    notify: func.isRequired,
  },

  handleAddFlashMessage({type, text}) {
    const {notify} = this.props

    notify(type, text)
  },

  render() {
    return (
      <div className="chronograf-root">
        <SideNav />
        <Notifications />
        {this.props.children &&
          React.cloneElement(this.props.children, {
            addFlashMessage: this.handleAddFlashMessage,
          })}
      </div>
    )
  },
})

const mapDispatchToProps = dispatch => ({
  notify: bindActionCreators(publishNotification, dispatch),
})

export default connect(null, mapDispatchToProps)(App)
