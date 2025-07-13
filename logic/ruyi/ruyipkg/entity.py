import React, { useRef, useEffect } from "react";
import useProvisionWizard from "../hooks/useProvisionWizard";
import "../styles/Terminal.css";

export default function Terminal() {
  const { history, input, onInputChange, onInputSubmit } = useProvisionWizard();
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history]);

  return (
    <div className="terminal">
      {history.map((msg, i) => (
        <div key={i} className={msg.type}>{msg.text}</div>
      ))}
      <form onSubmit={onInputSubmit}>
        <span className="prompt">$</span>
        <input
          value={input}
          onChange={onInputChange}
          autoFocus
          className="terminal-input"
        />
      </form>
      <div ref={endRef} />
    </div>
  );
}
