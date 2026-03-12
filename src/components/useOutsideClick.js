import { useEffect } from "react";
export default function useOutsideClick(ref, callback) {
    console.log('close pop up:- ',ref, callback)
  useEffect(() => {
    function handleClick(event) {
      if (ref.current && !ref.current.contains(event.target)) {
        callback();
      }
    }

    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  },);
}