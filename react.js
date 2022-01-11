/******************************* react 核心 *******************************/

/**
 * 内部渲染组件：这个实例为 react 内部负责渲染我们元素的，主要有三类
 * 1. 自定义组件渲染：CompositeComponent 负责，用于渲染我们写的自定义 react 组件.
 * 2. Dom 组件渲染： DomComponent 负责，用于渲染 div/span/a 等这种 dom 元素，他的特点是有一个或多个孩子。
 * 3. Text 组件渲染：TextComponent 负责，用于渲染 文本元素
 */

/**
 * 自定义组件
 */
class CompositeComponent {
  constructor(element, publicInstance) {
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

    /**
     * 以下三部就实现了一个递归
     * 
     * 1. 获取「自定义组件」 render 出来的结果
     * 写自定义组件时都要写一个 render 函数，并返回这个自定义组件要渲染的元素。
     * */ 
    let renderedElement = this.publicInstance.render();

    /**
     * 2. 初始化为 react 「内部渲染组件」
     */
    const renderedInstance = instanceComponent(renderedElement);
    /**
     * 3. 调用「内部渲染组件」的 mountComponent 方法
     */
    const image = renderedInstance.mountComponent(container);

    this.container = container;
    this.renderedElement = renderedElement;
    this.renderedInstance = renderedInstance;

    return image;
  }

  /**
   * 更新状态
   * @param {*} newState 
   */
  changeState() {
    let renderedElement = this.publicInstance.render();
    this.receiveComponent(renderedElement);
  }

  /**
   * 更新元素
   */
  updateComponent(nextElement) { 
    // 判断元素类型
    if (nextElement.type === this.renderedElement.type) {
      // 一样才更新
      this.renderedInstance.receiveComponent(nextElement);
    }
  }

  /**
   * 接受 父组件传递下来的元素更新
   * @param nextElement React.createElement 创建的对象
   */
  receiveComponent(nextElement) {
    this.updateComponent(nextElement)
  }

  /**
   * 卸载组件
   */
  unmountComponent() {
    if (this.publicInstance.componentWillUnmount) {
      this.publicInstance.componentWillUnmount();
    }
  }
}

/**
 * Dom 组件
 */
class DomComponent {
  constructor(element) {
    // virtual dom element
    this.element = element;
    // 孩子节点
    this.childrenInstances = {};
    // 内存记录的 dom 元素
    this.node = null;
  }

  mountComponent(countainer) {
    let dom = document.createElement(this.element.type);
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

  receiveComponent(nextElement) {
    /**
     * 1. 更新属性值
     * 2. dom + diff 对比，更新子节点
     */
    this.updateDomProperties(nextElement);
    this.updateChildren(nextElement);
  }

  /**
   * 更新属性值
   */
  updateDomProperties(nextElement) {
    for (var propKey in nextElement.props) {
      // 事件，暂时只做 onclick
      if (propKey.startsWith('on')) {
        this.node.node.onclick = nextElement.props[propKey];
      } else {
        this.node.node.setAttribute(propKey, nextElement.props[propKey]);
      }
    }
  }


  updateChildren(nextElement) {
    /**
     * 主要功能：
     * 1. 找出更新的，如位置变动，属性值变化
     * 2. 找出增加的
     * 3. 找出删除的
     * 
     * 步骤：
     * 1. 算出 name:instance 实例
     * 2. 再判断 更新、增加、删除
     */
    let mountImages = [];
    let removeNodes = [];
    
    // 得到一棵新的 vdom tree
    let nextChildren = this._updateChildrenInstance(nextElement, mountImages, removeNodes);

    /**
     * diff 算法：
     * 迭代新元素，看新元素在旧元素中的位置，定义 lastIndex 来标识当前访问过的最大旧元素 id
     * 1. 大的不动，小的往后移
     * 2. update 记录
     *  2.1 增加的时候记录他前一个元素
     *  2.2 移动的时候，记录移动谁后面
     *  2.3 删除的时候，则直接删除
     */
    let updates = [];
    let nextIndex = 0;
    let lastIndex = 0;
    let nextMountIndex = 0;
    let lastPlaceNode = null;
    for (let nextChildName in nextChildren) {
      let nextChild = nextChildren[nextChildName];
      let prevChild = this.childrenInstances[nextChildName];
      if (prevChild && nextChild.instance === prevChild.instance) {
        if (prevChild._mountIndex < lastIndex) {
          // 移动
          updates.push({
            type: 'MOVE',
            node: nextChild.instance.node,
            afterNode: lastPlaceNode
          })
        }

        lastIndex = Math.max(prevChild._mountIndex, lastIndex);
      } else {
        // 新增 
        if (prevChild) {
          lastIndex = Math.max(prevChild._mountIndex, lastIndex);
        }

        updates.push({
          type: 'INSERT',
          image: mountImages[nextMountIndex],
          afterNode: lastPlaceNode
        });

        nextMountIndex++;
      }

      lastPlaceNode = nextChild.instance.node;
      nextChild._mountIndex = nextIndex;
      nextIndex++;
    }

    for (let removeNode of removeNodes) {
      updates.push({
        type: 'REMOVE',
        node: removeNode
      });
    }

    this.childrenInstances = nextChildren;
    if (updates.length > 0) {
      this._patch(this, updates);
    }
  }

  /**
   * patch 到 dom 上
   * @param {更新数组} updates 
   */
  _patch(parentInstance, updates) {
    console.log('更新队列', updates);
    let parentNode = parentInstance.node.node;
    for (var update of updates) {
      if (update.type === 'MOVE') {
        parentNode.insertBefore(update.node.node, getNodeAfter(parentNode, update.afterNode.node));
      } else if (update.type === 'INSERT') {
        DOMLazyTree.insertTreeBefore(update.image, getNodeAfter(parentNode, update.afterNode.node), parentNode);
      } else if (update.type === 'REMOVE') {
        parentNode.removeChild(update.node.node);
      }
    }
  }

  _updateChildrenInstance(nextElement, mountImages, removeNodes) {
    /**
     * 操作：
     * 1. 当相同时，则调用实例更新
     * 2. 当新的不存在老的中时，则调用创建
     * 3. 当老的不存在新的中时，则调用删除
     */

    let nextChildren = {};
    let index = 0;
    let nextChildrenElement = flattenChildren(nextElement.children);
    for (let child of nextChildrenElement) {
      let name = child.key || index;
      nextChildren[name] = {
        name,
        element: child,
      };

      index++;
    }

    for (let nextChildName in nextChildren) {
      let previousChild = this.childrenInstances[nextChildName];
      let nextChild = nextChildren[nextChildName];

      // 元素相同，则更新
      if (previousChild &&
        isElementEqual(previousChild.element, nextChild.element)) {
        previousChild.instance.receiveComponent(nextChild.element);
        nextChild.instance = previousChild.instance;
      } else {
        // 元素不一样，则创建
        const childInstance = instanceComponent(nextChild.element);
        const childImage = childInstance.mountComponent(container);
        nextChild.instance = childInstance;
        mountImages.push(childImage);
      }
    }

    for (let prevChildName in this.childrenInstances) {
      let prevChild = this.childrenInstances[prevChildName];
      let nextChild = nextChildren[prevChildName];
      if (!nextChild) {
        // 元素不存在，则删除
        prevChild.instance.unmountComponent();
        removeNodes.push(prevChild.instance.node);
      }
    }

    return nextChildren;
  }

  unmountComponent() {

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

  receiveComponent(nextElement) {
    this.node.textContent = nextElement;
  } 

  unmountComponent() {

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
  /* text 节点*/
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
  if (typeof element.type === 'function') {
    internalInstance = new element.type();
    publicInstance = new CompositeComponent(element, internalInstance);
    internalInstance.wrapperComponent = publicInstance;
  } else if (typeof element.type === 'string' || typeof element.type === 'number') {
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
 * @param {标签} type 
 * @param {属性值} props 
 */
function createElement(type, props) {
  let children = Array.prototype.slice.call(arguments, 2);
  let key = props && props.key;

  return {
    key,
    type,
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


