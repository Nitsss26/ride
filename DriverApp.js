// DriverApp.js (Single File Expo App)
import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
    StyleSheet,
    Text,
    View,
    TouchableOpacity,
    ScrollView,
    Alert,
    ActivityIndicator,
    Switch,
    Platform,
    Dimensions,
    SafeAreaView,
    StatusBar,
    TextInput,
    Modal
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';

// --- Configuration ---
const BASE_URL = 'http://YOUR_BACKEND_IP_OR_DOMAIN'; // <-- IMPORTANT: REPLACE THIS
const DRIVER_SERVICE_URL = `${BASE_URL}:3001`;
const LOCATION_WS_URL = `ws://${BASE_URL.split('//')[1]}:3003`; // Location Service WebSocket
const NOTIFICATION_WS_URL = `ws://${BASE_URL.split('//')[1]}:3002`; // Notification Service WebSocket
const RIDE_SERVICE_URL = `${BASE_URL}:3000`; // For OTP Verification
const PAYMENT_SERVICE_URL = `${BASE_URL}:3004`; // For Cash Confirmation

const DRIVER_ID = "driver_" + Math.random().toString(36).substring(7); // Simple unique ID for demo
const LOCATION_UPDATE_INTERVAL = 5000; // 5 seconds

const THEME = {
    primary: '#FFFFFF', // White
    secondary: '#333333', // Dark Gray
    accent: '#008080', // Teal
    background: '#FFFFFF',
    text: '#333333',
    muted: '#777777',
    error: '#D32F2F',
    success: '#4CAF50',
    buttonText: '#FFFFFF',
    inputBackground: '#EEEEEE',
    goOnline: '#4CAF50', // Green
    goOffline: '#F44336', // Red
};

// --- Helper Functions ---
const apiRequest = async (url, method = 'GET', body = null) => {
    try {
        const options = {
            method,
            headers: {
                'Content-Type': 'application/json',
            },
        };
        if (body) {
            options.body = JSON.stringify(body);
        }
        const response = await fetch(url, options);
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: response.statusText }));
            throw new Error(`HTTP error! status: ${response.status}, message: ${errorData.message || 'Unknown error'}`);
        }
        return await response.json();
    } catch (error) {
        console.error(`API Request Error (${method} ${url}):`, error);
        throw error;
    }
};

// --- Main App Component ---
export default function DriverApp() {
    const [isOnline, setIsOnline] = useState(false);
    const [currentStatus, setCurrentStatus] = useState('offline'); // offline, available, en_route_pickup, at_pickup, on_ride
    const [driverDetails, setDriverDetails] = useState(null); // To store details like name, rating etc. fetched from backend
    const [currentRide, setCurrentRide] = useState(null); // Stores details of the accepted ride offer
    const [driverLocation, setDriverLocation] = useState(null); // Driver's own location
    const [isLoading, setIsLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [statusMessage, setStatusMessage] = useState('Welcome Driver!');
    const [activeRideOffer, setActiveRideOffer] = useState(null); // Stores incoming ride offer
    const [showOtpModal, setShowOtpModal] = useState(false);
    const [otpInput, setOtpInput] = useState('');

    const locationSubscription = useRef(null);
    const locationWs = useRef(null); // WebSocket for sending location updates
    const notificationWs = useRef(null); // WebSocket for receiving notifications/offers
    const mapRef = useRef(null);

    // --- Fetch Driver Details ---
    useEffect(() => {
        const fetchDetails = async () => {
            setIsLoading(true);
            try {
                // In a real app, you'd fetch based on logged-in user, here we use the demo ID
                 // First, try to fetch. If 404, create a dummy driver.
                 try {
                    const details = await apiRequest(`${DRIVER_SERVICE_URL}/drivers/${DRIVER_ID}`);
                    setDriverDetails(details);
                    // Sync initial state from DB
                    setIsOnline(details.isOnline);
                    setCurrentStatus(details.currentStatus);
                     setStatusMessage(`Welcome ${details.name}! Status: ${details.currentStatus}`);
                     if (details.lastKnownLocation?.coordinates) {
                          setDriverLocation({
                              latitude: details.lastKnownLocation.coordinates[1],
                              longitude: details.lastKnownLocation.coordinates[0],
                           });
                     }
                 } catch (fetchError) {
                     if (fetchError.message.includes('404')) {
                         console.log(`Driver ${DRIVER_ID} not found, creating dummy driver...`);
                          const dummyDriverData = {
                             _id: DRIVER_ID, // Use the generated ID
                             name: `Driver ${DRIVER_ID.slice(-4)}`,
                             phone: `+1${Math.floor(1000000000 + Math.random() * 9000000000)}`,
                             email: `${DRIVER_ID}@example.com`,
                             isOnline: false,
                             currentStatus: 'offline',
                             rating: 4.7,
                             vehicle: {
                                 make: "Toyota",
                                 model: "Camry",
                                 licensePlate: `DRV-${DRIVER_ID.slice(-4)}`,
                                 color: "Silver",
                                 type: "Sedan"
                              }
                          };
                          const createdDriver = await apiRequest(`${DRIVER_SERVICE_URL}/drivers`, 'POST', dummyDriverData);
                          setDriverDetails(createdDriver);
                           setStatusMessage(`Welcome ${createdDriver.name}! You are offline.`);
                     } else {
                          throw fetchError; // Re-throw other errors
                      }
                  }

            } catch (error) {
                setErrorMessage(`Failed to get driver details: ${error.message}`);
                 setStatusMessage('Error loading profile.');
            } finally {
                setIsLoading(false);
            }
        };
        fetchDetails();
    }, []); // Fetch on mount

    // --- Location Permission & Tracking ---
    useEffect(() => {
        let isMounted = true; // Prevent state updates on unmounted component

        const startLocationTracking = async () => {
            if (!isOnline) {
                 stopLocationTracking(); // Ensure tracking stops if toggled offline
                 return;
            }

            let { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                setErrorMessage('Permission to access location was denied');
                 setStatusMessage('Location permission needed to go online.');
                 setIsOnline(false); // Force offline if permission denied
                return;
            }

            setStatusMessage('Starting location tracking...');
            setErrorMessage('');

            try {
                locationSubscription.current = await Location.watchPositionAsync(
                    {
                        accuracy: Location.Accuracy.BestForNavigation,
                        timeInterval: LOCATION_UPDATE_INTERVAL,
                        distanceInterval: 10, // Update every 10 meters
                    },
                    (location) => {
                        if (!isMounted) return; // Check if component is still mounted
                        const newLocation = {
                            latitude: location.coords.latitude,
                            longitude: location.coords.longitude,
                            // timestamp: location.timestamp // timestamp from Location API
                        };
                        setDriverLocation(newLocation); // Update map marker
                        sendLocationUpdate(newLocation); // Send update via WebSocket
                    }
                );
                console.log("Location tracking started.");
                 setStatusMessage('Location tracking active.');
            } catch (error) {
                 console.error("Error starting location tracking:", error);
                 setErrorMessage('Could not start location tracking.');
                  setStatusMessage('Location tracking failed.');
                 if (isMounted) setIsOnline(false); // Turn off if tracking fails to start
            }
        };

        const stopLocationTracking = () => {
            if (locationSubscription.current) {
                locationSubscription.current.remove();
                locationSubscription.current = null;
                console.log("Location tracking stopped.");
                 // Don't clear driverLocation state here, keep last known on map
            }
            // Do not update status message here, let toggleOnline handle it
        };

        if (isOnline) {
            startLocationTracking();
        } else {
            stopLocationTracking();
        }

         // Cleanup function
         return () => {
             isMounted = false;
             stopLocationTracking();
         };

    }, [isOnline]); // Re-run when isOnline changes

    // --- WebSocket Connections (Location & Notifications) ---
    useEffect(() => {
        const setupWebSockets = () => {
            // Location WebSocket
             if (isOnline && (!locationWs.current || locationWs.current.readyState === WebSocket.CLOSED)) {
                 console.log(`Connecting Location WebSocket to ${LOCATION_WS_URL}?driverId=${DRIVER_ID}`);
                 const locSocket = new WebSocket(`${LOCATION_WS_URL}?driverId=${DRIVER_ID}`);
                 locSocket.onopen = () => console.log("Location WebSocket connected.");
                 locSocket.onmessage = (event) => { // Handle ACKs etc. from Location Service
                     try {
                        const data = JSON.parse(event.data);
                        if (data.type === 'location_ack') {
                            // console.log("Location update acknowledged by server.");
                        } else if (data.type === 'pong') {
                             // Received pong from location service
                        } else {
                             console.log("Location WS message:", data);
                        }
                     } catch (e) { console.error("Error parsing location WS message", e); }
                 };
                 locSocket.onerror = (error) => console.error("Location WebSocket error:", error.message);
                 locSocket.onclose = () => console.log("Location WebSocket closed.");
                 locationWs.current = locSocket;

                  // Ping location service
                  locationWs.current.pingInterval = setInterval(() => {
                      if (locationWs.current && locationWs.current.readyState === WebSocket.OPEN) {
                          locationWs.current.send(JSON.stringify({ type: 'ping' }));
                      }
                  }, 30000);

             } else if (!isOnline && locationWs.current) {
                  if (locationWs.current.pingInterval) clearInterval(locationWs.current.pingInterval);
                 locationWs.current.close();
                 locationWs.current = null;
             }


             // Notification WebSocket (always try to connect)
            if (!notificationWs.current || notificationWs.current.readyState === WebSocket.CLOSED) {
                console.log(`Connecting Notification WebSocket to ${NOTIFICATION_WS_URL}?userId=${DRIVER_ID}`);
                 const notifSocket = new WebSocket(`${NOTIFICATION_WS_URL}?userId=${DRIVER_ID}`);
                 notifSocket.onopen = () => {
                    console.log("Notification WebSocket connected");
                     setStatusMessage(isOnline ? 'Online and ready.' : 'Offline. Toggle switch to go online.');
                      // Ping notification service
                      notificationWs.current.pingInterval = setInterval(() => {
                          if (notifSocket.readyState === WebSocket.OPEN) {
                              notifSocket.send(JSON.stringify({ type: 'ping' }));
                          }
                      }, 30000);
                 };
                 notifSocket.onmessage = (event) => {
                     try {
                         const data = JSON.parse(event.data);
                         console.log("Notification WS message received:", data);
                         handleNotificationMessage(data);
                     } catch (error) {
                         console.error("Failed to parse notification message:", error);
                     }
                 };
                 notifSocket.onerror = (error) => {
                     console.error("Notification WebSocket error:", error.message);
                     setErrorMessage(`Notification service error: ${error.message}`);
                 };
                 notifSocket.onclose = (event) => {
                     console.log("Notification WebSocket closed:", event.code, event.reason);
                      if (notificationWs.current && notificationWs.current.pingInterval) {
                          clearInterval(notificationWs.current.pingInterval);
                      }
                     notificationWs.current = null; // Allow reconnect attempt
                     // Optional: reconnect logic
                     // setTimeout(setupWebSockets, 5000);
                 };
                 notificationWs.current = notifSocket;
            }
        };

        setupWebSockets(); // Initial setup

        // Cleanup on unmount or when isOnline changes significantly
        return () => {
            if (locationWs.current) {
                if (locationWs.current.pingInterval) clearInterval(locationWs.current.pingInterval);
                locationWs.current.close();
                locationWs.current = null;
            }
            if (notificationWs.current) {
                 if (notificationWs.current.pingInterval) clearInterval(notificationWs.current.pingInterval);
                notificationWs.current.close();
                notificationWs.current = null;
            }
        };
    }, [isOnline]); // Reconnect location WS if isOnline changes


     // --- Send Location Update via WebSocket ---
     const sendLocationUpdate = (location) => {
        if (locationWs.current && locationWs.current.readyState === WebSocket.OPEN) {
            const payload = {
                type: 'location_update',
                location: {
                    latitude: location.latitude,
                    longitude: location.longitude,
                },
                // Include rideId if currently on a ride
                 rideId: currentRide?.rideId || null,
            };
            try {
                 locationWs.current.send(JSON.stringify(payload));
                 // console.log("Sent location update:", payload); // Can be very noisy
            } catch (error) {
                 console.error("Failed to send location update:", error);
                 // Handle error, maybe try to reconnect WS
            }
        } else {
            // console.warn("Location WebSocket not open. Buffering or discarding update.");
            // Implement buffering logic if needed
        }
    };

    // --- Handle Incoming Notifications ---
    const handleNotificationMessage = (data) => {
        switch (data.type) {
            case 'ride_offer':
                // Avoid showing new offer if already busy
                 if (currentStatus === 'available') {
                     setActiveRideOffer(data); // { rideId, pickupLocation, dropoffLocation, estimatedFare, timeout }
                     setStatusMessage(`New ride offer! Accept/Reject within ${data.timeout}s.`);
                 } else {
                     console.log("Received ride offer but driver is not available. Ignoring.");
                      // Optionally auto-reject if needed by the system logic
                      // sendNotificationResponse('driver_reject', data.rideId, 'Currently busy');
                 }
                break;
            case 'offer_accepted': // Confirmation that our acceptance was processed
                 setStatusMessage(`Offer for ride ${data.rideId} accepted. Proceed to pickup.`);
                 // Status should be updated via Driver Service call -> DB -> Read
                 break;
             case 'offer_expired': // Our acceptance was too late, or offer timed out before we responded
                 Alert.alert("Offer Expired", data.message || `The offer for ride ${data.rideId} has expired.`);
                 if (activeRideOffer && activeRideOffer.rideId === data.rideId) {
                     setActiveRideOffer(null); // Clear the expired offer
                 }
                  setStatusMessage(isOnline ? 'Online and ready.' : 'Offline.');
                 break;
            case 'ride_cancelled':
                 Alert.alert("Ride Cancelled", data.message || `Ride ${data.rideId} has been cancelled.`);
                 if (currentRide && currentRide.rideId === data.rideId) {
                      // If it was the current ride, go back to available
                      handleRideCompletionOrCancellation(); // Resets state
                 } else if (activeRideOffer && activeRideOffer.rideId === data.rideId) {
                      // If it was an offer, clear it
                      setActiveRideOffer(null);
                       setStatusMessage(isOnline ? 'Online and ready.' : 'Offline.');
                 }
                 break;
             case 'arrival_confirmed':
                 setStatusMessage(`Arrival at pickup confirmed for ride ${data.rideId}. Waiting for OTP.`);
                  setCurrentStatus('at_pickup'); // Update local status display
                  updateBackendStatus('at_pickup', data.rideId); // Inform backend
                 break;
             case 'ride_started': // Confirmation that OTP was correct
                 setStatusMessage(`Ride ${data.rideId} is in progress.`);
                  setCurrentStatus('on_ride'); // Update local status display
                  // Backend status already updated by Ride Service on OTP verification
                 break;
             case 'ride_completed':
                 setStatusMessage(`Ride ${data.rideId} completed. Payment received.`);
                 // Let the payment confirmation logic handle state reset
                  handleRideCompletionOrCancellation();
                 break;
            case 'pong':
                 // console.log("Received pong from notification service");
                 break;
            default:
                console.log("Unknown notification type:", data.type);
        }
    };

    // --- Send Offer Response ---
    const sendNotificationResponse = (type, rideId, reason = null) => {
         if (notificationWs.current && notificationWs.current.readyState === WebSocket.OPEN) {
            const payload = { type, rideId };
            if (reason) payload.reason = reason;
            try {
                notificationWs.current.send(JSON.stringify(payload));
                console.log(`Sent ${type} response for ride ${rideId}`);
            } catch (error) {
                console.error(`Failed to send ${type} response:`, error);
                 setErrorMessage('Failed to send response. Check connection.');
            }
        } else {
            Alert.alert("Connection Error", "Cannot send response. Notification service disconnected.");
        }
    };

    // --- Actions ---
    const handleToggleOnline = async (value) => {
        setIsLoading(true);
        setErrorMessage('');
         const newStatus = value ? 'available' : 'offline';
         setStatusMessage(value ? 'Going online...' : 'Going offline...');

        try {
             await updateBackendStatus(newStatus);
             setIsOnline(value);
             setCurrentStatus(newStatus);
             setStatusMessage(value ? 'Online and ready.' : 'Offline.');
             if (!value) {
                 // Clear any active ride or offer when going offline
                 setActiveRideOffer(null);
                 setCurrentRide(null);
             }
        } catch (error) {
            Alert.alert("Status Update Failed", `Could not set status to ${newStatus}: ${error.message}`);
            setErrorMessage(error.message);
            // Revert UI state on failure
             setStatusMessage(isOnline ? 'Online and ready.' : 'Offline.');
        } finally {
            setIsLoading(false);
        }
    };

    const updateBackendStatus = async (status, rideId = null) => {
        try {
             await apiRequest(`${DRIVER_SERVICE_URL}/drivers/${DRIVER_ID}/status`, 'PUT', { status, rideId });
             console.log(`Backend status updated to ${status}`);
        } catch (error) {
             console.error(`Failed to update backend status to ${status}:`, error);
             throw error; // Re-throw to be caught by caller
        }
    };

     const handleAcceptOffer = () => {
        if (!activeRideOffer) return;
        const rideId = activeRideOffer.rideId;
        console.log(`Accepting ride offer: ${rideId}`);
        setStatusMessage(`Accepting Ride ${rideId}...`);
         setIsLoading(true); // Show loading indicator

        // Send acceptance via WebSocket BEFORE updating backend potentially
        sendNotificationResponse('driver_accept', rideId);

        // Optimistically update UI state
        setCurrentRide({
             rideId: rideId,
             pickupLocation: activeRideOffer.pickupLocation,
             dropoffLocation: activeRideOffer.dropoffLocation,
             status: 'en_route_pickup', // Assume en_route after accepting
         });
         setCurrentStatus('en_route_pickup'); // Update local status display
        setActiveRideOffer(null); // Clear the offer card

        // Backend status update happens via Notification Service -> Driver Service
        // We *could* call updateBackendStatus here as well for redundancy, but might cause race conditions.
        // Let's rely on the backend flow initiated by the 'driver_accept' WS message.
         setIsLoading(false); // Hide loading indicator after optimistic update
         setStatusMessage(`Accepted ride ${rideId}. Proceed to pickup.`);

         // No need to call updateBackendStatus('busy', rideId) here,
         // Notification Service's handleDriverAccept should trigger that flow.
    };

    const handleRejectOffer = () => {
        if (!activeRideOffer) return;
         const rideId = activeRideOffer.rideId;
         console.log(`Rejecting ride offer: ${rideId}`);
         setStatusMessage(`Rejecting Ride ${rideId}...`);
         sendNotificationResponse('driver_reject', rideId, 'Rejected by driver');
         setActiveRideOffer(null); // Clear the offer
          setStatusMessage(isOnline ? 'Online and ready.' : 'Offline.'); // Reset status message
    };

    const handleArrivedAtPickup = async () => {
        if (!currentRide) return;
         const rideId = currentRide.rideId;
         setStatusMessage(`Notifying arrival for ride ${rideId}...`);
         setIsLoading(true);
         try {
            // Update backend status first
             await updateBackendStatus('driver_arrived', rideId); // Update Driver Service (persists state)
             setCurrentStatus('at_pickup'); // Update local UI
             // Then inform Ride Service/Notification Service via Kafka (or direct call fallback)
             // In this setup, Notification service listens for ride-updates from Ride Service triggered by driver actions.
             // So, Ride service needs an endpoint for driver actions, or Driver Service publishes 'driver_arrived' event.
             // Let's assume Driver Service should publish an event or Ride Service has an endpoint.
             // Simplest for now: Driver Service PUT already happened. Let backend flow handle notifications.
             // OR, Driver Service PUT could trigger Kafka event 'ride-updates' with status 'driver_arrived'
             // OR, this app calls Ride Service directly (less ideal).

             // Assuming the backend flow works:
             setStatusMessage(`Arrived at pickup. Waiting for rider OTP.`);
             setShowOtpModal(true); // Show OTP input modal

         } catch (error) {
              Alert.alert("Arrival Notification Failed", error.message);
              setStatusMessage('Failed to notify arrival.');
         } finally {
             setIsLoading(false);
         }
    };

     const handleVerifyOtp = async () => {
        if (!currentRide || !otpInput) return;
        const rideId = currentRide.rideId;
        setIsLoading(true);
        setStatusMessage('Verifying OTP...');
        try {
            const response = await apiRequest(`${RIDE_SERVICE_URL}/rides/${rideId}/verify-otp`, 'POST', { otp: otpInput });
            if (response.success) {
                 Alert.alert("OTP Verified", "Ride started!");
                 setCurrentStatus('on_ride'); // Update local status
                 setCurrentRide(prev => ({ ...prev, status: 'on_ride' }));
                 setStatusMessage('Ride in progress...');
                 setShowOtpModal(false);
                 setOtpInput('');
                 // Backend status already updated by Ride Service
            } else {
                 Alert.alert("OTP Incorrect", response.message || "Invalid OTP. Please try again.");
                  setStatusMessage('Incorrect OTP.');
            }
        } catch (error) {
             Alert.alert("OTP Verification Failed", error.message || "Could not verify OTP.");
             setStatusMessage('OTP verification failed.');
        } finally {
            setIsLoading(false);
        }
    };

     const handleCompleteRideCash = async () => {
        if (!currentRide) return;
         const rideId = currentRide.rideId;
         setStatusMessage('Confirming cash payment...');
         setIsLoading(true);
         try {
              const response = await apiRequest(`${PAYMENT_SERVICE_URL}/payments/cash`, 'POST', {
                 rideId: rideId,
                 driverId: DRIVER_ID,
                 riderId: "rider_unknown", // FIXME: Need riderId from ride object
                 amount: currentRide.estimatedFare?.amount || 10.00, // FIXME: Get actual/estimated fare
                 currency: currentRide.estimatedFare?.currency || 'USD',
             });
             Alert.alert("Payment Confirmed", "Ride marked as completed (Cash).");
             handleRideCompletionOrCancellation(); // Reset state
             // Backend flow (Payment Service -> Kafka -> Ride/Driver Service) will update statuses
         } catch (error) {
              Alert.alert("Payment Confirmation Failed", error.message);
              setStatusMessage('Failed to confirm cash payment.');
         } finally {
             setIsLoading(false);
         }
     };

      const handleRideCompletionOrCancellation = async () => {
         setStatusMessage('Updating status to available...');
         setIsLoading(true);
          try {
              // Ensure backend status is updated to available
               await updateBackendStatus('available');
               setCurrentStatus('available'); // Update local UI
               setCurrentRide(null);
               setActiveRideOffer(null);
               setOtpInput('');
               setShowOtpModal(false);
               setStatusMessage('You are now available for new rides.');
          } catch (error) {
               Alert.alert("Status Update Failed", `Could not set status to available: ${error.message}`);
               // UI state might be inconsistent with backend here - needs robust handling
               setStatusMessage('Error updating status. Please retry going online.');
          } finally {
              setIsLoading(false);
          }
      };


    // --- Map Fitting Logic ---
     useEffect(() => {
        if (!mapRef.current || !driverLocation) return;

        const markers = [];
        markers.push({ latitude: driverLocation.latitude, longitude: driverLocation.longitude });

        if (currentRide?.status === 'en_route_pickup' || currentRide?.status === 'at_pickup') {
             if (currentRide.pickupLocation?.geo?.coordinates) {
                 markers.push({ latitude: currentRide.pickupLocation.geo.coordinates[1], longitude: currentRide.pickupLocation.geo.coordinates[0] });
             }
         } else if (currentRide?.status === 'on_ride') {
             if (currentRide.dropoffLocation?.geo?.coordinates) {
                  markers.push({ latitude: currentRide.dropoffLocation.geo.coordinates[1], longitude: currentRide.dropoffLocation.geo.coordinates[0] });
              }
          }

        if (markers.length > 0) {
            mapRef.current.fitToCoordinates(markers, {
                edgePadding: { top: 50, right: 50, bottom: 150, left: 50 }, // Adjust padding
                animated: true,
            });
        }
    }, [driverLocation, currentRide]); // Re-fit map when driver or ride destination changes

     // Memoize map marker
     const driverMarker = useMemo(() => {
        if (!driverLocation) return null;
        return (
             <Marker
                 key="driver"
                 coordinate={driverLocation}
                 title="Your Location"
                 pinColor={THEME.accent} // Driver is teal
             >
                 <View style={styles.carIcon}>
                     <Text>🚗</Text>
                  </View>
             </Marker>
         );
     }, [driverLocation]);

     const rideMarkers = useMemo(() => {
          const m = [];
           if (currentRide?.status === 'en_route_pickup' || currentRide?.status === 'at_pickup') {
              if (currentRide.pickupLocation?.geo?.coordinates) {
                   m.push(
                       <Marker
                           key="pickup"
                           coordinate={{ latitude: currentRide.pickupLocation.geo.coordinates[1], longitude: currentRide.pickupLocation.geo.coordinates[0] }}
                           title="Pickup"
                           description={currentRide.pickupLocation.address}
                           pinColor="green"
                       />
                   );
              }
          } else if (currentRide?.status === 'on_ride') {
               if (currentRide.dropoffLocation?.geo?.coordinates) {
                    m.push(
                        <Marker
                            key="dropoff"
                            coordinate={{ latitude: currentRide.dropoffLocation.geo.coordinates[1], longitude: currentRide.dropoffLocation.geo.coordinates[0] }}
                            title="Dropoff"
                            description={currentRide.dropoffLocation.address}
                            pinColor="red"
                        />
                    );
               }
           }
          return m;
      }, [currentRide]);


    // --- Render Logic ---
    const renderContent = () => {
        // 1. Show Active Ride Offer First (if any)
        if (activeRideOffer) {
            return (
                <View style={styles.offerContainer}>
                    <Text style={styles.offerTitle}>New Ride Offer!</Text>
                     <Text style={styles.infoText}>From: {activeRideOffer.pickupLocation?.address || 'N/A'}</Text>
                     <Text style={styles.infoText}>To: {activeRideOffer.dropoffLocation?.address || 'N/A'}</Text>
                     <Text style={styles.infoText}>Fare: {activeRideOffer.estimatedFare?.amount || 'N/A'} {activeRideOffer.estimatedFare?.currency || ''}</Text>
                     <View style={styles.buttonRow}>
                         <TouchableOpacity
                             style={[styles.button, styles.acceptButton]}
                             onPress={handleAcceptOffer}
                             disabled={isLoading}
                         >
                              <Text style={styles.buttonText}>Accept</Text>
                         </TouchableOpacity>
                          <TouchableOpacity
                             style={[styles.button, styles.rejectButton]}
                             onPress={handleRejectOffer}
                             disabled={isLoading}
                         >
                              <Text style={styles.buttonText}>Reject</Text>
                         </TouchableOpacity>
                     </View>
                     <Text style={styles.timerText}>Time remaining: {activeRideOffer.timeout}s</Text>
                      {isLoading && <ActivityIndicator style={{marginTop: 10}} color={THEME.accent} />}
                </View>
            );
        }

         // 2. Show Current Ride Info (if active)
        if (currentRide) {
             return (
                 <View style={styles.statusContainer}>
                     <Text style={styles.statusTitleBold}>Current Ride: {currentRide.rideId?.slice(-6)}</Text>
                     <Text style={styles.infoText}>Status: <Text style={{fontWeight: 'bold'}}>{currentStatus.replace('_', ' ').toUpperCase()}</Text></Text>
                      {currentRide.pickupLocation && <Text style={styles.infoText}>Pickup: {currentRide.pickupLocation.address}</Text>}
                      {currentRide.dropoffLocation && <Text style={styles.infoText}>Dropoff: {currentRide.dropoffLocation.address}</Text>}

                      {/* Action Buttons based on Status */}
                      {currentStatus === 'en_route_pickup' && (
                          <TouchableOpacity
                              style={[styles.button, isLoading && styles.buttonDisabled]}
                              onPress={handleArrivedAtPickup}
                              disabled={isLoading}
                          >
                               {isLoading ? <ActivityIndicator color={THEME.buttonText} /> : <Text style={styles.buttonText}>Arrived at Pickup</Text>}
                          </TouchableOpacity>
                      )}
                       {currentStatus === 'at_pickup' && (
                           <>
                           <Text style={styles.infoText}>Waiting for Rider OTP verification.</Text>
                            <TouchableOpacity
                                style={[styles.button, isLoading && styles.buttonDisabled]}
                                onPress={() => setShowOtpModal(true)} // Re-open OTP modal if closed
                                disabled={isLoading}
                            >
                                <Text style={styles.buttonText}>Enter OTP</Text>
                            </TouchableOpacity>
                            </>
                       )}
                       {currentStatus === 'on_ride' && (
                           <TouchableOpacity
                               style={[styles.button, isLoading && styles.buttonDisabled]}
                               onPress={handleCompleteRideCash} // Assuming cash for demo
                               disabled={isLoading}
                           >
                                {isLoading ? <ActivityIndicator color={THEME.buttonText} /> : <Text style={styles.buttonText}>Complete Ride (Confirm Cash)</Text>}
                           </TouchableOpacity>
                       )}
                  </View>
             );
         }

         // 3. Show Idle/Offline Status
        return (
             <View style={styles.statusContainer}>
                 <Text style={styles.statusTitle}>
                      {isOnline ? 'Waiting for Rides' : 'You are Offline'}
                  </Text>
                 <Text style={styles.infoText}>
                      {driverDetails ? `${driverDetails.name} (${driverDetails.rating} ★)` : 'Loading...'}
                 </Text>
                  <Text style={styles.infoText}>
                      {driverDetails?.vehicle ? `${driverDetails.vehicle.color} ${driverDetails.vehicle.make} ${driverDetails.vehicle.model} (${driverDetails.vehicle.licensePlate})` : ''}
                   </Text>
             </View>
         );
    };


    return (
        <SafeAreaView style={styles.safeArea}>
            <StatusBar barStyle={Platform.OS === 'ios' ? 'dark-content' : 'default'} backgroundColor={THEME.background} />
            <View style={styles.container}>
                 {/* Header */}
                 <View style={styles.header}>
                     <Text style={styles.headerTitle}>RideVerse Driver</Text>
                     <View style={styles.onlineToggleContainer}>
                         <Text style={[styles.onlineLabel, { color: isOnline ? THEME.goOnline : THEME.text }]}>
                              {isOnline ? 'Online' : 'Offline'}
                          </Text>
                         <Switch
                              trackColor={{ false: THEME.muted, true: THEME.accent }}
                              thumbColor={isOnline ? THEME.goOnline : THEME.muted}
                              ios_backgroundColor={THEME.muted}
                              onValueChange={handleToggleOnline}
                              value={isOnline}
                              disabled={isLoading} // Disable while loading state change
                          />
                     </View>
                 </View>

                <MapView
                    ref={mapRef}
                    style={styles.map}
                    initialRegion={driverLocation ? {
                        ...driverLocation,
                        latitudeDelta: 0.02, // Zoom in closer for driver
                        longitudeDelta: 0.02,
                    } : { // Default region
                        latitude: 40.7128, longitude: -74.0060,
                        latitudeDelta: 0.0922, longitudeDelta: 0.0421,
                    }}
                    showsUserLocation={false} // Don't show default blue dot
                    // followsUserLocation={true} // Maybe? Or fit markers instead
                    loadingEnabled={true}
                >
                    {driverMarker}
                    {rideMarkers}
                </MapView>

                {/* Content Area */}
                <View style={[styles.contentOverlay, activeRideOffer && styles.contentOverlayOffer]}>
                    <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
                         {isLoading && !activeRideOffer && currentStatus !== 'available' && <ActivityIndicator style={styles.mainLoader} size="large" color={THEME.accent} />}
                         {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
                        {renderContent()}
                    </ScrollView>
                </View>

                 {/* Status Bar */}
                 <View style={styles.statusBar}>
                      <Text style={styles.statusTextContent} numberOfLines={1}>{statusMessage}</Text>
                  </View>

                  {/* OTP Input Modal */}
                 <Modal
                     animationType="slide"
                     transparent={true}
                     visible={showOtpModal}
                     onRequestClose={() => setShowOtpModal(false)}
                 >
                     <View style={styles.modalCenteredView}>
                         <View style={styles.modalView}>
                             <Text style={styles.modalTitle}>Enter Rider OTP</Text>
                             <TextInput
                                 style={styles.otpInput}
                                 placeholder="Enter 6-digit OTP"
                                 keyboardType="number-pad"
                                 maxLength={6}
                                 value={otpInput}
                                 onChangeText={setOtpInput}
                                 autoFocus={true}
                             />
                             <TouchableOpacity
                                 style={[styles.button, styles.modalButton, (isLoading || otpInput.length !== 6) && styles.buttonDisabled]}
                                 onPress={handleVerifyOtp}
                                 disabled={isLoading || otpInput.length !== 6}
                             >
                                 {isLoading ? <ActivityIndicator color={THEME.buttonText}/> : <Text style={styles.buttonText}>Verify OTP & Start Ride</Text>}
                             </TouchableOpacity>
                             <TouchableOpacity
                                 style={[styles.button, styles.modalButton, styles.cancelButton]}
                                 onPress={() => { setShowOtpModal(false); setOtpInput(''); }}
                                 disabled={isLoading}
                             >
                                 <Text style={styles.buttonText}>Cancel</Text>
                             </TouchableOpacity>
                         </View>
                     </View>
                 </Modal>

            </View>
        </SafeAreaView>
    );
}

// --- Styles ---
const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: THEME.background,
    },
    container: {
        flex: 1,
        backgroundColor: THEME.background,
    },
     header: {
         flexDirection: 'row',
         justifyContent: 'space-between',
         alignItems: 'center',
         paddingHorizontal: 15,
         paddingVertical: 10,
         borderBottomWidth: 1,
         borderBottomColor: THEME.muted + '40', // Lighter border
         backgroundColor: THEME.background, // Ensure header has background
     },
      headerTitle: {
          fontSize: 18,
          fontWeight: 'bold',
          color: THEME.text,
      },
      onlineToggleContainer: {
          flexDirection: 'row',
          alignItems: 'center',
      },
      onlineLabel: {
          marginRight: 8,
          fontSize: 14,
          fontWeight: '500',
      },
    map: {
        flex: 1, // Map takes remaining space
        // ...StyleSheet.absoluteFillObject, // Map takes full screen background
        // Ensure map is behind the content overlay
    },
    contentOverlay: {
        position: 'absolute',
        bottom: 60, // Leave space for status bar
        left: 0,
        right: 0,
        // maxHeight: Dimensions.get('window').height * 0.45, // Allow slightly more height
        backgroundColor: THEME.background + 'E9', // Slightly transparent white
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        paddingTop: 5, // Reduced top padding
         shadowColor: "#000",
         shadowOffset: { width: 0, height: -2 },
         shadowOpacity: 0.1,
         shadowRadius: 4,
         elevation: 5,
    },
     contentOverlayOffer: {
        // Special style when offer is showing, maybe make it taller
        // maxHeight: Dimensions.get('window').height * 0.50,
    },
    scrollContent: {
       paddingHorizontal: 20,
       paddingTop: 15,
       paddingBottom: 30, // Extra padding at the bottom of scroll
    },
    offerContainer: {
       padding: 15,
       borderWidth: 2,
       borderColor: THEME.accent,
       borderRadius: 10,
       backgroundColor: THEME.accent + '10', // Light accent background
   },
    offerTitle: {
       fontSize: 18,
       fontWeight: 'bold',
       color: THEME.accent,
       textAlign: 'center',
       marginBottom: 10,
   },
    statusContainer: {
       alignItems: 'center',
       paddingVertical: 10,
   },
    statusTitle: {
       fontSize: 18,
       fontWeight: '500',
       color: THEME.text,
       marginBottom: 5,
       textAlign: 'center',
   },
   statusTitleBold: {
        fontSize: 18,
        fontWeight: 'bold',
        color: THEME.text,
        marginBottom: 10,
        textAlign: 'center',
    },
   infoText: {
       color: THEME.text,
       textAlign: 'center',
       fontSize: 15,
       lineHeight: 22,
       marginBottom: 8,
   },
    button: {
        backgroundColor: THEME.accent,
        paddingVertical: 14,
        paddingHorizontal: 20,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: 15,
        shadowColor: THEME.secondary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
        elevation: 3,
        minWidth: '80%', // Ensure buttons are reasonably wide
    },
    buttonDisabled: {
        backgroundColor: THEME.muted,
        elevation: 0,
    },
    buttonText: {
        color: THEME.buttonText,
        fontSize: 16,
        fontWeight: 'bold',
    },
    buttonRow: {
       flexDirection: 'row',
       justifyContent: 'space-around',
       width: '100%',
       marginTop: 15,
   },
    acceptButton: {
       backgroundColor: THEME.goOnline, // Green for accept
       minWidth: '45%', // Adjust width for side-by-side
       marginHorizontal: 5,
   },
    rejectButton: {
       backgroundColor: THEME.goOffline, // Red for reject
       minWidth: '45%', // Adjust width for side-by-side
       marginHorizontal: 5,
   },
   cancelButton: {
        backgroundColor: THEME.muted,
        marginTop: 10,
    },
    timerText: {
        textAlign: 'center',
        marginTop: 10,
        color: THEME.muted,
        fontSize: 13,
    },
    statusBar: {
       position: 'absolute',
       bottom: 0,
       left: 0,
       right: 0,
       backgroundColor: THEME.secondary,
       paddingVertical: 8,
       paddingHorizontal: 15,
        height: 50, // Fixed height
        justifyContent: 'center',
   },
   statusTextContent: {
       color: THEME.primary,
       fontSize: 14,
       textAlign: 'center',
   },
    errorText: {
        color: THEME.error,
        textAlign: 'center',
        marginVertical: 10,
        fontSize: 14,
        paddingHorizontal: 10,
    },
     mainLoader: {
         marginVertical: 20,
     },
      carIcon: {
         padding: 5,
         // backgroundColor: 'rgba(0, 128, 128, 0.7)', // Semi-transparent Teal
         // borderRadius: 15,
         // width: 30,
         // height: 30,
         // justifyContent: 'center',
         // alignItems: 'center',
         // borderColor: THEME.primary,
         // borderWidth: 1,
     },
     modalCenteredView: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: 'rgba(0,0,0,0.6)',
    },
    modalView: {
        margin: 20,
        backgroundColor: THEME.primary,
        borderRadius: 15,
        padding: 25,
        alignItems: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
        width: '90%',
    },
     modalTitle: {
         marginBottom: 20,
         textAlign: "center",
         fontSize: 20,
         fontWeight: "bold",
         color: THEME.text,
     },
     otpInput: {
        width: '80%',
        height: 50,
        borderColor: THEME.accent,
        borderWidth: 1,
        borderRadius: 8,
        textAlign: 'center',
        fontSize: 24,
        marginBottom: 20,
        letterSpacing: 8, // Space out digits
        backgroundColor: THEME.inputBackground,
        color: THEME.text,
     },
     modalButton: {
        width: '90%', // Make buttons wider in modal
     }
});
