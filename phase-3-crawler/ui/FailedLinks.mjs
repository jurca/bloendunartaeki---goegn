import Component from '../node_modules/@jurca/-x-ignore/Component.js'
import {define} from '../node_modules/@jurca/-x-ignore/ignore.js'
import tpl from '../node_modules/@jurca/-x-ignore/template/templateFactory.js'
import {renderToDom} from '../node_modules/@jurca/-x-ignore/renderer.js'

const ITEMS_PER_PAGE = 15

export default class FailedLinks extends Component {
    static get props() {
        return ['links', 'onResetLink']
    }

    constructor(root) {
        super(renderToDom)

        this._root = root
        this._currentPage = 1
    }

    render() {
        const links = this.props.links || []
        const startingPage = Math.max(1, this._currentPage - Math.ceil(ITEMS_PER_PAGE / 2))
        const pageCount = Math.ceil(links.length / ITEMS_PER_PAGE)
        const endingPage = Math.min(pageCount, this._currentPage + Math.ceil(ITEMS_PER_PAGE / 2))
        const pages = []
        for (let page = startingPage; page <= endingPage; page++) {
            if (page === startingPage && startingPage > 1) {
                pages.push(1, null)
            }
            pages.push(page)
            if (page === endingPage && endingPage < pageCount) {
                pages.push(null, pageCount)
            }
        }
        const currentLinks = links.slice((this._currentPage - 1) * ITEMS_PER_PAGE, this._currentPage * ITEMS_PER_PAGE)

        return tpl`
            <style>
                @import 'https://stackpath.bootstrapcdn.com/bootstrap/4.1.3/css/bootstrap.min.css'
            </style>
            <h2>Failed links</h2>
            ${currentLinks.map(link => tpl`
                <failed-link .url=${link.url} .error=${link.error.message} .onReset=${this.onResetLink.bind(this, link)}/>
            `)}
            <nav>
                <ul class="pagination">
                    ${pages.map((page) => tpl`
                        <li class="page-item${page === this._currentPage ? ' active' : ''}${page ? '' : ' disabled'}">
                            ${page ?
                                tpl`
                                    <a href="#" class="page-link" .onclick=${this.onSetPage.bind(this, page)}>
                                        ${page}
                                    </a>
                                `
                                :
                                tpl`
                                    <span class="page-link">
                                        &hellip;
                                    </span>
                                `
                            }
                        </li>
                    `)}
                </ul>
            </nav>
        `
    }

    onSetPage(page) {
        if (page === this._currentPage) {
            return false
        }

        this._currentPage = page
        this._root.links = this.props.links // force update
        return false
    }

    onResetLink(link) {
        this.props.onResetLink(link)
    }
}

define('failed-links', FailedLinks)
