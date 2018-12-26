import Component from '../node_modules/@jurca/-x-ignore/Component.js'
import {define} from '../node_modules/@jurca/-x-ignore/ignore.js'
import {renderToDom} from '../node_modules/@jurca/-x-ignore/naiveRenderer.js'

export default class ActionButton extends Component {
    constructor(rootNode) {
        super(renderToDom)

        this._rootNode = rootNode
    }

    render() {
        const type = this.props.type || this._rootNode.getAttribute('type')

        return `
            <style>
                @import 'https://stackpath.bootstrapcdn.com/bootstrap/4.1.3/css/bootstrap.min.css'
            </style>
            <button class="btn${type ? ` btn-${type}` : ''}">
                <slot/>
            </button>
        `
    }
}
ActionButton.props = ['type']

define('action-button', ActionButton)
