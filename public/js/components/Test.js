import React, {Component} from "react";

import image from '../../images/note.png';

class App extends Component {
  render() {
    return (
      <>
      <h1>Hello</h1>
      <h2>World</h2>
      <h3>Hey yo</h3>
      <img src={image} alt="A musical note."></img>
      </>
    )
  }
}

export default App;