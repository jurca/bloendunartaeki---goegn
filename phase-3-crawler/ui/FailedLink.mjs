import Component from '../node_modules/@jurca/-x-ignore/Component.js'
import {define} from '../node_modules/@jurca/-x-ignore/ignore.js'
import tpl from '../node_modules/@jurca/-x-ignore/template/templateFactory.js'
import {renderToDom} from '../node_modules/@jurca/-x-ignore/renderer.js'

export default class FailedLink extends Component {
    static get props() {
        return ['url', 'error', 'onReset']
    }

    constructor() {
        super(renderToDom)
    }

    render() {
        const {error, url, onReset} = this.props

        return tpl`
            <style>
                @import 'https://stackpath.bootstrapcdn.com/bootstrap/4.1.3/css/bootstrap.min.css'
            </style>
            <div class="row border-top pt-1">
                <div class="col">
                    ${url}
                </div>
                <div class="col-1 d-flex justify-content-end">
                    <button class="btn btn-success" .onclick=${onReset}>reset</button>
                </div>
            </div>
            <div class="row">
                <div class="col">
                    ${error}
                </div>
            </div>
        `
    }
}

define('failed-link', FailedLink)
