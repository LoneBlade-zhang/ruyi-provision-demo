import React, { useRef, useEffect } from "react";
import useProvisionWizard from "../hooks/useProvisionWizard";
import "../styles/Terminal.css";

export default function Terminal() {
  const { history, input, onInputChange, onInputSubmit, error, downloadProgress } = useProvisionWizard();
  const terminalRef = useRef(null);

  useEffect(() => {
    // 监听键盘事件
    const handleKeyPress = (e) => {
      if (downloadProgress !== null) return;
      
      if (e.key === 'Enter') {
        onInputSubmit(e);
      } else if (e.key === 'Backspace') {
        onInputChange({ target: { value: input.slice(0, -1) } });
      } else if (e.key.length === 1) { // 只处理单个字符的输入
        onInputChange({ target: { value: input + e.key } });
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [input, onInputChange, onInputSubmit, downloadProgress]);

  useEffect(() => {
    terminalRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history, input]);

  return (
    <div className="terminal" tabIndex={0}>
      <div className="terminal-content">
        {history.map((msg, i) => (
          <div key={i} className={msg.type}>{msg.text}</div>
        ))}
        {error && <div className="error">{error}</div>}
        {downloadProgress !== null && (
          <div className="progress">
            <div className="progress-text">
              % Total    % Received % Xferd  Average Speed   Time    Time     Time  Current
                                 Dload  Upload   Total   Spent    Left  Speed
            </div>
            <div className="progress-text">
              {downloadProgress.toString().padStart(3)} 895M  {downloadProgress.toString().padStart(3)} 895M    0     0  2150k      0  0:07:06  0:07:06 --:--:-- 2728k
            </div>
          </div>
        )}
        <div className="current-line">
          <span className="output">{input}</span>
          <span className="cursor">_</span>
        </div>
        <div ref={terminalRef} />
      </div>
    </div>
  );
} 