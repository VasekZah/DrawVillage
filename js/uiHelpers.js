// uiHelpers.js

function createElement(tag, classNames = [], innerHTML = '') {
    const el = document.createElement(tag);
    if (Array.isArray(classNames)) {
        el.classList.add(...classNames);
    } else if (classNames) {
        el.classList.add(classNames);
    }
    if (innerHTML) el.innerHTML = innerHTML;
    return el;
}

function clearElement(el) {
    while (el.firstChild) {
        el.removeChild(el.firstChild);
    }
}

function setStyles(el, styles) {
    Object.assign(el.style, styles);
}

function createButton(label, onClick, classNames = []) {
    const button = createElement('button', classNames, label);
    if (onClick) {
        button.addEventListener('click', onClick);
    }
    return button;
}

function createInput(type, placeholder = '', value = '', classNames = []) {
    const input = createElement('input', classNames);
    input.type = type;
    input.placeholder = placeholder;
    input.value = value;
    return input;
}

function createSelect(options = [], selectedValue = '', classNames = []) {
    const select = createElement('select', classNames);
    options.forEach(opt => {
        const optionEl = createElement('option');
        optionEl.value = opt.value;
        optionEl.textContent = opt.label;
        if (opt.value === selectedValue) {
            optionEl.selected = true;
        }
        select.appendChild(optionEl);
    });
    return select;
}

function appendChildren(parent, children) {
    children.forEach(child => parent.appendChild(child));
}
