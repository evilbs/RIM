/******************************* react 核心 *******************************/
/**
 * 自定义组件
 */
class CompositeComponent {
  constructor(element, publicInstance) {
    // 这里触发事件 componentWillMount
    this.publicInstance = publicInstance;
    this.element = element;
    this.renderedElement = null;
    this.node = null;
  }

  /** 
   * 首次 render
   */
  mountComponent(container) {
    this.node = container;

    let renderedElement = this.publicInstance.render();
    const renderedInstance = instanceComponent(renderedElement);
    const image = renderedInstance.mountComponent(container);

    this.container = container;
    this.renderedElement = renderedElement;
    this.renderedInstance = renderedInstance;

    return image;
  } 
}

/**
 * Dom 组件
 */
class DomComponent {
  constructor(element) {
    this.element = element;
    this.childrenInstances = {};
    this.node = null;
  }

  mountComponent(countainer) {
    let dom = document.createElement(this.element.tag);
    let image = DOMLazyTree.LazyTree(dom);

    // 设置 props
    for (var propKey in this.element.props) {
      // 事件，暂时只做 onclick
      if (propKey.startsWith('on')) {
        dom.onclick = this.element.props[propKey];
      } else {
        dom.setAttribute(propKey, this.element.props[propKey]);
      }
    }

    // 迭代子节点，进行创建
    if (this.element.children) {
      let index = 0;
      let children = flattenChildren(this.element.children);
      for (var childElement of children) {
        const childInstance = instanceComponent(childElement);
        const childImage = childInstance.mountComponent(container);
        image.children.push(childImage);

        let name = childElement.key || index;
        this.childrenInstances[name] = {
          name,
          instance: childInstance,
          element: childElement,
          _mountIndex: index++
        }
      }
    }

    this.node = image;
    return image;
  } 
}

/**
 * 文本组件
 */
class TextComponent {
  constructor(element) {
    this.element = element;
    this.node = null;
  }

  mountComponent(container) {
    let node = document.createTextNode(this.element);
    this.node = node;
    return node;
  } 
}

/**
 * 扁平化子元素，有时 children 里面包含数组
 * @param {*} elementChildren 
 */
function flattenChildren(elementChildren) {
  let children = [];
  for (let element of elementChildren) {
    if (Array.isArray(element)) {
      children = [...children, ...element];
    } else {
      children.push(element);
    }
  }

  return children;
}

/**
 * 判断两个元素是否一样
 * @param {*} prevElement 
 * @param {*} nextElement 
 */
function isElementEqual(prevElement, nextElement) {
  var prevEmpty = prevElement === null || prevElement === false;
  var nextEmpty = nextElement === null || nextElement === false;
  if (prevEmpty || nextEmpty) {
    return prevEmpty === nextEmpty;
  }

  var prevType = typeof prevElement;
  var nextType = typeof nextElement;
  if (prevType === 'string' || prevType === 'number') {
    return nextType === 'string' || nextType === 'number';
  } else {
    return (
      nextType === 'object' &&
      prevElement.type === nextElement.type &&
      prevElement.key === nextElement.key
    );
  }
}

/**
 * 根据元素实例化成内存对象
 * @param {React.createElement 创建的元素} element 
 */
function instanceComponent(element) {
  let publicInstance;
  if (typeof element.tag === 'function') {
    internalInstance = new element.tag();
    publicInstance = new CompositeComponent(element, internalInstance);
    internalInstance.wrapperComponent = publicInstance;
  } else if (typeof element.tag === 'string' || typeof element.tag === 'number') {
    publicInstance = new DomComponent(element);
  } else {
    publicInstance = new TextComponent(element);
  }

  return publicInstance;
}

/******************************* 帮助方法 *******************************/
const DOMLazyTree = {
  insertTreeBefore(lazyTree, afterNode, parentNode) {
    this.mountTree(lazyTree, parentNode, false);
    let node = lazyTree.node ? lazyTree.node : lazyTree;
    if (afterNode) {
      parentNode.insertBefore(node, afterNode);
    } else {
      parentNode.appendChild(node);
    }
  },
  mountTree(lazyTree, container, isInsert = true) {
    if (lazyTree.children) {
      for (var child of lazyTree.children) {
        this.mountTree(child, lazyTree.node);
      }
    }

    // 放在这里很重要，小小的一个改变，却是做了很大的事情，避免了大量 repaint reflow
    if (isInsert) {
      if (lazyTree.node) {
        container.appendChild(lazyTree.node);
      } else {
        // 有可能是 text
        container.appendChild(lazyTree);
      }
    }
  },
  toString() {
    return this.node.nodeName;
  },
  LazyTree(node) {
    return {
      node: node,
      children: [],
      html: null,
      text: null,
      toString: this.toString,
    };
  }
}

function getNodeAfter(parentNode, node) {
  if (Array.isArray(node)) {
    node = node[1];
  }
  return node ? node.nextSibling : parentNode.firstChild;
}

/**************** react 暴露对外 api ****************/
/**
 * 创建一个元素
 * @param {标签} tag 
 * @param {属性值} props 
 */
function createElement(tag, props) {
  let children = Array.prototype.slice.call(arguments, 2);
  let key = props && props.key;

  return {
    key,
    tag,
    props,
    children
  }
}

/**
 * 创建自定义类
 * 暂时只能用于最新版浏览器
 */
class Component {
  constructor() {
    // todo: 违反了单向依赖，后期再改
    this.wrapperComponent = null;
  }

  /**
   * 修改当前组件的状态
   */
  setState(partialState) {
    // state 一修改，需要重新 render 当前所在子树
    /**
     * 1. 状态合并
     * 2. 调用事件，判断是否需要更新
     * 3. 再调用组件 render 方法，得到渲染后的值
     */
    // let renderedComponent = this.render();
    // this.wrapperComponent.receiveComponent(renderedComponent);

    // 开始处理并更新
    this.state = { ...this.state, ...partialState };
    this.wrapperComponent.changeState(this.state);
  }
}

/**
 * 渲染方法
 */
function render(root, container) {
  let element = React.createElement(root, null);
  const publicInstance = instanceComponent(element);
  const image = publicInstance.mountComponent(element, container);

  // 开始把 image render 到节点上，这里有 lazyTree
  _mountToNode(image, container);
}


function _mountToNode(image, container) {
  DOMLazyTree.mountTree(image, container);
}

let React = {
  createElement,
  Component,
  render
};