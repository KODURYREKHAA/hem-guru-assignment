import "./App.css";
import React, { useState, useEffect } from "react";
import io from "socket.io-client";
import Cookies from "js-cookie";

const socket = io("http://localhost:5000");

const App = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [loginError, setLoginError] = useState("");
  const [registerError, setRegisterError] = useState("");

  useEffect(() => {
    const token = Cookies.get("token");
    if (token) {
      validateToken(token);
    }
  }, []);

  useEffect(() => {
    const handleMessage = (message) => {
      console.log("Received message:", message);
      setMessages((prevMessages) => [...prevMessages, message]);
    };

    socket.on("message", handleMessage);

    return () => {
      socket.off("message", handleMessage);
    };
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchMessages();
    }
  }, [isAuthenticated]);

  const validateToken = async (token) => {
    try {
      const response = await fetch("http://localhost:5000/api/validate-token", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "x-auth-token": token,
        },
      });
      if (response.ok) {
        setIsAuthenticated(true);
      } else {
        Cookies.remove("token");
      }
    } catch (error) {
      console.error("Token validation failed:", error);
      Cookies.remove("token");
    }
  };

  const fetchMessages = async () => {
    const token = Cookies.get("token");
    const response = await fetch("http://localhost:5000/api/messages", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "x-auth-token": token,
      },
    });
    const data = await response.json();
    setMessages(data);
  };

  const register = async () => {
    setRegisterError(""); // Clear previous errors
    const response = await fetch("http://localhost:5000/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    if (response.ok) {
      const data = await response.json();
      console.log(data.display_msg);
      setUsername("");
      setPassword("");
    } else {
      const errorData = await response.json();
      setRegisterError(
        errorData.display_msg || "Registration failed. Please try again."
      );
    }
  };

  const login = async () => {
    setLoginError(""); // Clear previous errors
    const response = await fetch("http://localhost:5000/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    if (response.ok) {
      const token = await response.text();
      Cookies.set("token", token);
      setIsAuthenticated(true);
      setUsername("");
      setPassword("");
    } else {
      const errorData = await response.text();
      setLoginError(
        errorData || "Login failed. Please check your credentials."
      );
    }
  };

  const sendMessage = async () => {
    const token = Cookies.get("token");
    await fetch("http://localhost:5000/api/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-auth-token": token,
      },
      body: JSON.stringify({ receiver: "anotherUser", content: message }),
    });
    setMessage("");
  };

  const logout = () => {
    Cookies.remove("token");
    setIsAuthenticated(false);
    setMessages([]);
  };

  return (
    <div className="container">
      {!isAuthenticated ? (
        <div className="auth-container">
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button onClick={register}>Register</button>
          {registerError && (
            <div className="error-message">{registerError}</div>
          )}
          <button onClick={login}>Login</button>
          {loginError && <div className="error-message">{loginError}</div>}
        </div>
      ) : (
        <div className="chat-container">
          <button className="logout-button" onClick={logout}>
            Logout
          </button>
          <div className="message-list">
            {messages.map((msg, index) => (
              <div className="message" key={index}>
                <strong>{msg.sender}: </strong>
                {msg.content}
              </div>
            ))}
          </div>
          <div className="send-message-container">
            <input
              type="text"
              placeholder="Message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
            <button onClick={sendMessage}>Send</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
