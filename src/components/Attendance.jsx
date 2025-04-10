import React, { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import '../styles/Attendance.css';

const Attendance = () => {
  const [logs, setLogs] = useState([]);
  const [status, setStatus] = useState('');
  const [notification, setNotification] = useState(null);
  const token = localStorage.getItem('employeeToken');
  const isInitialMount = useRef(true); // Flag to track initial mount

  useEffect(() => {
    // Skip initial double execution in Strict Mode
    if (isInitialMount.current) {
      isInitialMount.current = false;
    } else {
      loadAttendance();
      checkLocation(); // Initial check
    }

    const interval = setInterval(checkLocation, 30000); // Check every 30 seconds
    return () => clearInterval(interval); // Cleanup interval on unmount
  }, [token]); // Dependency on token to re-run if it changes

  const checkLocation = async () => {
    if (!token) {
      setStatus('Please log in or register to enable auto attendance.');
      return;
    }

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          console.log('Current Latitude:', latitude);
          console.log('Current Longitude:', longitude);
          const distance = getDistance(latitude, longitude, OFFICE_LOCATION.lat, OFFICE_LOCATION.lng);
          console.log('Distance from office (meters):', distance);
          setStatus(distance <= OFFICE_LOCATION.radius ? 'You are within the office boundary!' : 'You are outside the office boundary!');

          const today = new Date().toISOString().split('T')[0];
          const attendance = await api.get('api/attendance', { headers: { 'x-employee-token': token } }).then(res => 
            res.data.find(log => log.date === today && !log.checkOut)
          );

          if (distance <= OFFICE_LOCATION.radius && !attendance) {
            const response = await api.post('api/checkin', {}, { headers: { 'x-employee-token': token } });
            if (response.data.message.includes('Checked in')) {
              const { title, body } = response.data.notification;
              setNotification({ title, body });
              sendNotification(title, body);
            }
          } else if (distance > OFFICE_LOCATION.radius && attendance) {
            await api.post('api/checkout', {}, { headers: { 'x-employee-token': token } });
            setNotification(null);
          }
        },
        (error) => setStatus('Error fetching location: ' + error.message)
      );
    } else {
      setStatus('Geolocation not supported.');
    }
  };

  const getDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3;
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const loadAttendance = async () => {
    if (!token) return;
    try {
      const response = await api.get('api/attendance', { headers: { 'x-employee-token': token } });
      setLogs(response.data);
    } catch (error) {
      console.error('Attendance fetch error:', error);
    }
  };

  const sendNotification = (title, body) => {
    if (Notification.permission === 'granted') {
      new Notification(title, { body });
    } else if (Notification.permission !== 'denied') {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') new Notification(title, { body });
      });
    }
  };

  const OFFICE_LOCATION = { lat: 11.6722701, lng: 78.1193823, radius: 100 };

  return (
    <div className="attendance-container">
      <h2>Your Attendance Log</h2>
      {notification && (
        <div className="notification">
          <h3>{notification.title}</h3>
          <p>{notification.body}</p>
        </div>
      )}
      <p className="status">{status}</p>
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Check-In</th>
            <th>Check-Out</th>
          </tr>
        </thead>
        <tbody>
          {logs.length === 0 ? (
            <tr><td colSpan="3">No records found</td></tr>
          ) : (
            logs.map((log, index) => (
              <tr key={index}>
                <td>{log.date || new Date(log._id?.getTimestamp()).toLocaleDateString() || '-'}</td>
                <td>{log.checkIn ? new Date(log.checkIn).toLocaleTimeString() : '-'}</td>
                <td>{log.checkOut ? new Date(log.checkOut).toLocaleTimeString() : '-'}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default Attendance;