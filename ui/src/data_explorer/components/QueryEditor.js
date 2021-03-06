import React, {PropTypes, Component} from 'react'
import _ from 'lodash'
import classNames from 'classnames'

import Dropdown from 'src/shared/components/Dropdown'
import LoadingDots from 'src/shared/components/LoadingDots'
import TemplateDrawer from 'src/shared/components/TemplateDrawer'
import {QUERY_TEMPLATES} from 'src/data_explorer/constants'
import {TEMPLATE_MATCHER} from 'src/dashboards/constants'

class QueryEditor extends Component {
  constructor(props) {
    super(props)
    this.state = {
      value: this.props.query,
      isTemplating: false,
      selectedTemplate: {
        tempVar: _.get(this.props.templates, ['0', 'tempVar'], ''),
      },
      filteredTemplates: this.props.templates,
    }

    this.handleKeyDown = ::this.handleKeyDown
    this.handleChange = ::this.handleChange
    this.handleUpdate = ::this.handleUpdate
    this.handleChooseTemplate = ::this.handleChooseTemplate
    this.handleCloseDrawer = ::this.handleCloseDrawer
    this.findTempVar = ::this.findTempVar
    this.handleTemplateReplace = ::this.handleTemplateReplace
    this.handleMouseOverTempVar = ::this.handleMouseOverTempVar
    this.handleClickTempVar = ::this.handleClickTempVar
    this.closeDrawer = ::this.closeDrawer
  }

  componentWillReceiveProps(nextProps) {
    if (this.props.query !== nextProps.query) {
      this.setState({value: nextProps.query})
    }
  }

  handleCloseDrawer() {
    this.setState({isTemplating: false})
  }

  handleMouseOverTempVar(template) {
    this.handleTemplateReplace(template)
  }

  handleClickTempVar(template) {
    // Clicking a tempVar does the same thing as hitting 'Enter'
    this.handleTemplateReplace(template, 'Enter')
    this.closeDrawer()
  }

  closeDrawer() {
    this.setState({
      isTemplating: false,
      selectedTemplate: {
        tempVar: _.get(this.props.templates, ['0', 'tempVar'], ''),
      },
    })
  }

  handleKeyDown(e) {
    const {isTemplating, value} = this.state

    if (isTemplating) {
      switch (e.key) {
        case 'ArrowRight':
        case 'ArrowDown':
          e.preventDefault()
          return this.handleTemplateReplace(this.findTempVar('next'))
        case 'ArrowLeft':
        case 'ArrowUp':
          e.preventDefault()
          return this.handleTemplateReplace(this.findTempVar('previous'))
        case 'Enter':
          e.preventDefault()
          this.handleTemplateReplace(this.state.selectedTemplate, e.key)
          return this.closeDrawer()
        case 'Escape':
          e.preventDefault()
          return this.closeDrawer()
      }
    } else if (e.key === 'Escape') {
      e.preventDefault()
      this.setState({value, isTemplating: false})
    } else if (e.key === 'Enter') {
      e.preventDefault()
      this.handleUpdate()
    }
  }

  handleTemplateReplace(selectedTemplate, key) {
    const {selectionStart, value} = this.editor
    const isEnter = key === 'Enter'
    const {tempVar} = selectedTemplate

    let templatedValue
    const matched = value.match(TEMPLATE_MATCHER)
    if (matched) {
      const newTempVar = isEnter
        ? tempVar
        : tempVar.substring(0, tempVar.length - 1)
      templatedValue = value.replace(TEMPLATE_MATCHER, newTempVar)
    }

    const enterModifier = isEnter ? 0 : -1
    const diffInLength = tempVar.length - matched[0].length + enterModifier

    this.setState({value: templatedValue, selectedTemplate}, () =>
      this.editor.setSelectionRange(
        selectionStart + diffInLength,
        selectionStart + diffInLength
      )
    )
  }

  findTempVar(direction) {
    const {filteredTemplates: templates} = this.state
    const {selectedTemplate} = this.state

    const i = _.findIndex(templates, selectedTemplate)
    const lastIndex = templates.length - 1

    if (i >= 0) {
      if (direction === 'next') {
        return templates[(i + 1) % templates.length]
      }

      if (direction === 'previous') {
        if (i === 0) {
          return templates[lastIndex]
        }

        return templates[i - 1]
      }
    }

    return templates[0]
  }

  handleChange() {
    const {templates} = this.props
    const {selectedTemplate} = this.state
    const value = this.editor.value
    const matches = value.match(TEMPLATE_MATCHER)
    if (matches) {
      // maintain cursor poition
      const start = this.editor.selectionStart
      const end = this.editor.selectionEnd
      const filteredTemplates = templates.filter(t =>
        t.tempVar.includes(matches[0].substring(1))
      )

      const found = filteredTemplates.find(
        t => t.tempVar === selectedTemplate && selectedTemplate.tempVar
      )
      const newTemplate = found ? found : filteredTemplates[0]

      this.setState({
        isTemplating: true,
        selectedTemplate: newTemplate,
        filteredTemplates,
        value,
      })
      this.editor.setSelectionRange(start, end)
    } else {
      this.setState({isTemplating: false, value})
    }
  }

  handleUpdate() {
    this.props.onUpdate(this.state.value)
  }

  handleChooseTemplate(template) {
    this.setState({value: template.query})
  }

  handleSelectTempVar(tempVar) {
    this.setState({selectedTemplate: tempVar})
  }

  render() {
    const {config: {status}} = this.props
    const {
      value,
      isTemplating,
      selectedTemplate,
      filteredTemplates,
    } = this.state

    return (
      <div className="query-editor">
        <textarea
          className="query-editor--field"
          onChange={this.handleChange}
          onKeyDown={this.handleKeyDown}
          onBlur={this.handleUpdate}
          ref={editor => (this.editor = editor)}
          value={value}
          placeholder="Enter a query or select database, measurement, and field below and have us build one for you..."
          autoComplete="off"
          spellCheck="false"
        />
        <div
          className={classNames('varmoji', {'varmoji-rotated': isTemplating})}
        >
          <div className="varmoji-container">
            <div className="varmoji-front">{this.renderStatus(status)}</div>
            <div className="varmoji-back">
              {isTemplating
                ? <TemplateDrawer
                    onClickTempVar={this.handleClickTempVar}
                    templates={filteredTemplates}
                    selected={selectedTemplate}
                    onMouseOverTempVar={this.handleMouseOverTempVar}
                    handleClickOutside={this.handleCloseDrawer}
                  />
                : null}
            </div>
          </div>
        </div>
      </div>
    )
  }

  renderStatus(status) {
    if (!status) {
      return (
        <div className="query-editor--status">
          <Dropdown
            items={QUERY_TEMPLATES}
            selected={'Query Templates'}
            onChoose={this.handleChooseTemplate}
            className="query-editor--templates"
          />
        </div>
      )
    }

    if (status.loading) {
      return (
        <div className="query-editor--status">
          <LoadingDots />
          <Dropdown
            items={QUERY_TEMPLATES}
            selected={'Query Templates'}
            onChoose={this.handleChooseTemplate}
            className="query-editor--templates"
          />
        </div>
      )
    }

    return (
      <div className="query-editor--status">
        <span
          className={classNames('query-status-output', {
            'query-status-output--error': status.error,
            'query-status-output--success': status.success,
            'query-status-output--warning': status.warn,
          })}
        >
          <span
            className={classNames('icon', {
              stop: status.error,
              checkmark: status.success,
              'alert-triangle': status.warn,
            })}
          />
          {status.error || status.warn || status.success}
        </span>
        <Dropdown
          items={QUERY_TEMPLATES}
          selected={'Query Templates'}
          onChoose={this.handleChooseTemplate}
          className="query-editor--templates"
        />
      </div>
    )
  }
}

const {arrayOf, func, shape, string} = PropTypes

QueryEditor.propTypes = {
  query: string.isRequired,
  onUpdate: func.isRequired,
  config: shape().isRequired,
  templates: arrayOf(
    shape({
      tempVar: string.isRequired,
    })
  ),
}

export default QueryEditor
