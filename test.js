class App extends React.Component {
  constructor() {
    super();
    this.state = { isOpen: false };
  }

  render() {
    /*
    <div>
      <Head></Head>
      <Content></Content>
      <Footer></Footer>
    </div>
    */
    return React.createElement("div", null,
      React.createElement(Head, null),
      React.createElement(Content, null),
      React.createElement(Footer, null));
  }
}


class Head extends React.Component {
  constructor() {
    super();
    this.state = {};
  }

  render() {
    /**
     <div class="header">header</div>
     */
    return React.createElement("div", {
      class: "header"
    }, "通过 es6 写的一个 react 库");
  }
}

const todos = [
  { id: 'job1', text: '1:重构淘宝' },
  { id: 'job2', text: '2:重构支付宝' },
  { id: 'job3', text: '3:重构阿里云' },
  { id: 'job4', text: '4:重构天猫' },
];

const todos1 = [
  { id: 'job2', text: '2:重构支付宝' },
  { id: 'job3', text: '3:重构阿里云' },
  { id: 'job1', text: '1:重构淘宝' },
  { id: 'job5', text: '5:重构大文娱' },
  { id: 'job4', text: '4:重构天猫' },
];

class Content extends React.Component {
  constructor() {
    super();
    this.state = {
      count: 0,
      todos: todos
    };
  }

  onPlus() {
    this.setState({ count: this.state.count + 1 });
  }

  onSubtruct() {
    this.setState({ count: this.state.count - 1 });
  }

  changTodos() {
    this.setState({ todos: this.state.todos === todos ? todos1 : todos });
  }

  render() {
    /**
    <div class={this.state.count % 2===0 ? 'content-1' : 'content-2'}>	         {this.state.count}
      {
        this.state.count %2 ===0 ? <div>boy</div> : <span>girl</span>
      }
      <button onClick={this.onPlus.bind(this)}>+</button>
      <button onClick={this.onSubtruct.bind(this)}>-</button>
    </div>    
     */
    return React.createElement("div", null, React.createElement("div", {
      class: "content"
    },
      React.createElement("p", null, "counter"),
      React.createElement("div", {
        class: this.state.count % 2 === 0 ? 'content-1' : 'content-2'
      },
        this.state.count,
        React.createElement("button", {
          style: 'display:inline:block;padding-left:5px;',
          onClick: this.onPlus.bind(this)
        }, "+"), React.createElement("button", {
          onClick: this.onSubtruct.bind(this)
        }, "-")),
      React.createElement("div", {
        style: 'padding-top:15px;',
      }, React.createElement("p", null, "todo list"), React.createElement("button", {
        onClick: this.changTodos.bind(this)
      }, "\u53D8\u5316\u4EFB\u52A1\u987A\u5E8F"),
        React.createElement("div", {
          class: this.state.todos === todos ? 'content-1' : 'content-2'
        }, this.state.todos.map(function (todo) {
          return React.createElement("p", {
            key: todo.key
          }, todo.text);
        })))));
  }
}

class Footer extends React.Component {
  constructor() {
    super();
  }

  render() {
    /**
     <div class="footer">footer</div>
     */
    return React.createElement("div", { class: 'footer' },
      React.createElement('p', null, "仅供用于深入分析 react 实现原理，请勿用于生产环境。源码:"),
      React.createElement('a', { href: "http://39.97.248.105:8088/react.js", target: '_blank' }, "1. react.js"),
      React.createElement('br'),
      React.createElement('a', { href: "http://39.97.248.105:8088/test.js", target: '_blank' }, "2. app.js"));;
  }
}

React.render(App, document.getElementById('container'));