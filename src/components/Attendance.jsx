import React, { useState, useEffect } from 'react';
import api from '../services/api';
import '../styles/Attendance.css';

const Attendance = () => {
  const [logs, setLogs] = useState([]);
  const [status, setStatus] = useState('');
  const [notification, setNotification] = useState(null);
  const [currentLocation, setCurrentLocation] = useState({ lat: null, lng: null }); // Added state for location
  const token = localStorage.getItem('employeeToken');

  useEffect(() => {
    loadAttendance();
    checkLocation();

    const interval = setInterval(checkLocation, 30000);
    return () => clearInterval(interval);
  }, [token]);

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
          setCurrentLocation({ lat: latitude, lng: longitude }); // Update location state
          const distance = getDistance(latitude, longitude, OFFICE_LOCATION.lat, OFFICE_LOCATION.lng);
          console.log('Distance from office (meters):', distance);
          setStatus(distance <= OFFICE_LOCATION.radius ? 'You are within the office boundary!' : 'You are outside the office boundary!');

          const today = new Date().toISOString().split('T')[0];
          try {
            const response = await api.get('/attendance', { headers: { 'x-employee-token': token } });
            const attendance = response.data.find(log => log.date === today && !log.checkOut);

            if (distance <= OFFICE_LOCATION.radius && !attendance) {
              const response = await api.post('/checkin', {}, { headers: { 'x-employee-token': token } });
              if (response.data.message && response.data.message.includes('Checked in')) {
                const { title, body } = response.data.notification || { title: 'Check-in', body: 'Successfully checked in' };
                setNotification({ title, body });
                sendNotification(title, body);
                loadAttendance();
              }
            } else if (distance > OFFICE_LOCATION.radius && attendance) {
              await api.post('/checkout', {}, { headers: { 'x-employee-token': token } });
              setNotification(null);
              loadAttendance();
            }
          } catch (error) {
            console.error('Error checking attendance status:', error);
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
      const response = await api.get('/attendance', { headers: { 'x-employee-token': token } });
      console.log('Attendance data received:', response.data);
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

  const OFFICE_LOCATION = { lat: 11.644636, lng: 78.122278, radius: 55000 };

  const formatTime = (timeString) => {
    if (!timeString) return '-';
    try {
      return new Date(timeString).toLocaleTimeString();
    } catch (error) {
      console.error('Error formatting time:', error);
      return timeString || '-';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    if (typeof dateString === 'string' && dateString.includes('-')) {
      return dateString;
    }
    try {
      return new Date(dateString).toLocaleDateString();
    } catch (error) {
      console.error('Error formatting date:', error);
      return dateString || '-';
    }
  };

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
      <div className="location-info">
        <p>Current Latitude: {currentLocation.lat?.toFixed(6) || 'Not available'}</p>
        <p>Current Longitude: {currentLocation.lng?.toFixed(6) || 'Not available'}</p>
      </div>
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
                <td>{formatDate(log.date)}</td>
                <td>{formatTime(log.checkIn)}</td>
                <td>{formatTime(log.checkOut)}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default Attendance;