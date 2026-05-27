import { useEffect } from "react";
import { S } from "../styles/theme.js";

export default function Toast({ msg, onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2500);
    return () => clearTimeout(t);
  }, []);
  return <div style={S.toast}>{msg}</div>;
}
