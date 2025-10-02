import React from "react";
import { Analytics } from "@vercel/analytics/react";
import MonadMainnetLoader from "./MonadMainnetLoader";
import "./App.css";

function App() {
  return (
    <div className="App">
      <MonadMainnetLoader />
      <Analytics />
    </div>
  );
}

export default App;
