// RiderApp.js (Single File Expo App)
import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
    StyleSheet,
    Text,
    View,
    TextInput,
    TouchableOpacity,
    ScrollView,
    Alert,
    ActivityIndicator,
    Modal,
    Platform,
    Dimensions,
    SafeAreaView,
    StatusBar
} from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps'; // Assuming expo-location and react-native-maps are installed
import * as Location from 'expo-location';

// --- Configuration ---
// Use placeholder IPs/domains. Replace with your actual backend IP/domain accessible from your emulator/device.
// If using Docker on localhost: Use host machine's IP or a tunnel service like ngrok.
// If using Expo Go on physical device: Ensure backend is accessible on the same network.
const BASE_URL = 'http://YOUR_BACKEND_IP_OR_DOMAIN'; // <-- IMPORTANT: REPLACE THIS
const RIDE_SERVICE_URL = `${BASE_URL}:3000`;
const PAYMENT_SERVICE_URL = `${BASE_URL}:3004`;
const NOTIFICATION_WS_URL = `ws://${BASE_URL.split('//')[1]}:3002`; // Extract host for WS

const RIDER_ID = "rider_" + Math.random().toString(36).substring(7); // Simple unique ID for demo

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
        throw error; // Re-throw for handling in components
    }
};

// --- Main App Component ---
export default function RiderApp() {
    const [currentScreen, setCurrentScreen] = useState('HOME'); // HOME, REQUESTING, WAITING, ON_RIDE, COMPLETED
    const [pickupLocation, setPickupLocation] = useState({ address: '123 Main St', geo: { coordinates: [-74.0060, 40.7128] } }); // Default NYC
    const [dropoffLocation, setDropoffLocation] = useState({ address: '456 Market St', geo: { coordinates: [-73.9857, 40.7484] } }); // Default NYC
    const [currentRide, setCurrentRide] = useState(null);
    const [driverLocation, setDriverLocation] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [statusMessage, setStatusMessage] = useState('Welcome!');
    const [userLocation, setUserLocation] = useState(null); // Rider's current location
    const [otp, setOtp] = useState(null); // OTP received from notification
    const [showOtpModal, setShowOtpModal] = useState(false);

    const ws = useRef(null);
    const mapRef = useRef(null);

    // --- Location Permission & Tracking ---
    useEffect(() => {
        (async () => {
            let { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                setErrorMessage('Permission to access location was denied');
                setStatusMessage('Location permission denied.');
                // Use default location
                setUserLocation({
                    latitude: pickupLocation.geo.coordinates[1],
                    longitude: pickupLocation.geo.coordinates[0],
                });
                return;
            }

            try {
                let location = await Location.getCurrentPositionAsync({});
                const newUserLocation = {
                    latitude: location.coords.latitude,
                    longitude: location.coords.longitude,
                };
                setUserLocation(newUserLocation);
                // Optionally update pickup location based on current location
                // setPickupLocation({ address: 'Current Location', geo: { coordinates: [location.coords.longitude, location.coords.latitude] } });
                setStatusMessage('Location acquired.');

                 // Fit map to user location initially
                 if (mapRef.current && newUserLocation) {
                    mapRef.current.animateToRegion({
                        ...newUserLocation,
                        latitudeDelta: 0.02,
                        longitudeDelta: 0.02,
                    }, 1000);
                }

            } catch (error) {
                 console.error("Error getting current location:", error);
                 setErrorMessage('Could not get current location.');
                 setStatusMessage('Error getting location.');
                 // Use default location on error
                 setUserLocation({
                     latitude: pickupLocation.geo.coordinates[1],
                     longitude: pickupLocation.geo.coordinates[0],
                 });
            }
        })();
    }, []);

    // --- WebSocket Connection ---
    useEffect(() => {
        const connectWebSocket = () => {
            if (ws.current && ws.current.readyState === WebSocket.OPEN) {
                console.log("WebSocket already open.");
                return;
            }
            console.log(`Attempting to connect WebSocket to ${NOTIFICATION_WS_URL}?userId=${RIDER_ID}`);
            setStatusMessage('Connecting to RideVerse...');

            const socket = new WebSocket(`${NOTIFICATION_WS_URL}?userId=${RIDER_ID}`);

            socket.onopen = () => {
                console.log("WebSocket connected");
                setStatusMessage('Connected to RideVerse.');
                setErrorMessage('');
                 // Send ping periodically to keep connection alive
                 ws.current.pingInterval = setInterval(() => {
                    if (socket.readyState === WebSocket.OPEN) {
                        socket.send(JSON.stringify({ type: 'ping' }));
                    }
                }, 30000); // Every 30 seconds
            };

            socket.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    console.log("WebSocket message received:", data);
                    handleWebSocketMessage(data);
                } catch (error) {
                    console.error("Failed to parse WebSocket message:", error);
                }
            };

            socket.onerror = (error) => {
                console.error("WebSocket error:", error.message || 'Unknown error');
                setErrorMessage(`Connection error. Please restart. (${error.message})`);
                setStatusMessage('Connection lost.');
                // Optional: Implement retry logic with backoff
            };

            socket.onclose = (event) => {
                console.log("WebSocket closed:", event.code, event.reason);
                setStatusMessage('Disconnected.');
                 if (ws.current && ws.current.pingInterval) {
                    clearInterval(ws.current.pingInterval);
                 }
                ws.current = null; // Clear ref on close
                // Optional: Attempt to reconnect after a delay
                 // setTimeout(connectWebSocket, 5000); // Reconnect after 5s
            };

            ws.current = socket;
        };

        connectWebSocket();

        // Cleanup on unmount
        return () => {
             if (ws.current) {
                if (ws.current.pingInterval) {
                    clearInterval(ws.current.pingInterval);
                 }
                console.log("Closing WebSocket connection.");
                ws.current.close();
                ws.current = null;
            }
        };
    }, []); // Run only once on mount

    // --- WebSocket Message Handler ---
    const handleWebSocketMessage = (data) => {
        setStatusMessage(data.message || `Update: ${data.type}`); // Update status bar

        switch (data.type) {
            case 'connection_ack':
                // Already handled in onopen
                break;
            case 'driver_assigned':
                setCurrentRide(prev => ({ ...prev, status: 'driver_assigned', driverId: data.driverId, vehicleDetails: data.vehicleDetails }));
                setCurrentScreen('WAITING');
                setStatusMessage(`Driver ${data.driverId ? data.driverId.slice(-4) : 'N/A'} is on the way!`);
                setDriverLocation(null); // Reset driver location when newly assigned
                break;
            case 'driver_location_update':
                 if (currentRide && currentRide.rideId === data.rideId && currentRide.status !== 'completed') {
                    setDriverLocation(data.location); // { latitude, longitude, timestamp }
                    // console.log("Updated driver location:", data.location);
                }
                break;
             case 'driver_arrived':
                 setCurrentRide(prev => ({ ...prev, status: 'driver_arrived' }));
                 setStatusMessage('Driver has arrived! Verify OTP.');
                 setOtp(data.otp); // Store the OTP
                 setShowOtpModal(true); // Show OTP to rider
                 break;
             case 'ride_started':
                  setCurrentRide(prev => ({ ...prev, status: 'in-progress' }));
                  setCurrentScreen('ON_RIDE');
                  setStatusMessage('Ride in progress...');
                  setShowOtpModal(false); // Hide OTP modal
                  setOtp(null);
                  break;
            case 'ride_completed':
                setCurrentRide(prev => ({ ...prev, status: 'completed', fare: data.fare }));
                setCurrentScreen('COMPLETED');
                setStatusMessage(`Ride completed! Fare: ${data.fare?.amount || 'N/A'} ${data.fare?.currency || ''}`);
                setDriverLocation(null); // Clear driver location
                // Reset after a delay
                setTimeout(() => {
                     setCurrentRide(null);
                     setCurrentScreen('HOME');
                     setStatusMessage('Ready for next ride.');
                 }, 5000);
                break;
            case 'ride_cancelled':
            case 'ride_timed_out':
                 Alert.alert("Ride Cancelled", data.message || `Ride ${data.rideId} was ${data.type}.`);
                 setCurrentRide(null);
                 setCurrentScreen('HOME');
                 setDriverLocation(null);
                 setStatusMessage(data.message || 'Ride cancelled or timed out.');
                 setIsLoading(false);
                 break;
             case 'offer_expired': // If rider's request timed out at notification service
             case 'no_drivers_found': // If no drivers found by driver service
                 Alert.alert("No Drivers Available", data.message || "Could not find a driver for your request. Please try again later.");
                 setCurrentRide(null);
                 setCurrentScreen('HOME');
                 setStatusMessage('No drivers found. Try again?');
                 setIsLoading(false);
                 break;
            case 'error':
                setErrorMessage(data.message || 'An unknown error occurred.');
                setStatusMessage('Error received.');
                break;
             case 'pong':
                 // console.log("Received pong");
                 break;
            default:
                console.log("Unknown WebSocket message type:", data.type);
        }
    };

    // --- Ride Request Logic ---
    const handleRequestRide = async () => {
        if (!pickupLocation.address || !dropoffLocation.address) {
            Alert.alert("Missing Location", "Please enter both pickup and dropoff locations.");
            return;
        }
        setIsLoading(true);
        setErrorMessage('');
        setStatusMessage('Requesting ride...');
        setCurrentScreen('REQUESTING');
        setDriverLocation(null);

        try {
            const rideData = {
                riderId: RIDER_ID,
                pickupLocation: pickupLocation,
                dropoffLocation: dropoffLocation,
                preferences: { vehicleType: 'Any' }, // Example preference
            };
            const requestedRide = await apiRequest(`${RIDE_SERVICE_URL}/rides`, 'POST', rideData);
            setCurrentRide({ ...requestedRide, rideId: requestedRide._id }); // Store rideId explicitly
            setStatusMessage('Ride requested. Waiting for driver...');
             // Screen transition will happen on 'driver_assigned' message
             // Keep screen as 'REQUESTING' or move to 'WAITING' immediately?
             // Let's move to WAITING immediately after successful request post
             setCurrentScreen('WAITING');

        } catch (error) {
            Alert.alert("Request Failed", error.message || "Could not request ride. Please try again.");
            setErrorMessage(error.message);
            setStatusMessage('Ride request failed.');
            setCurrentScreen('HOME');
            setCurrentRide(null);
        } finally {
            setIsLoading(false);
        }
    };

     // --- Map Fitting Logic ---
     useEffect(() => {
        if (!mapRef.current) return;

        const markers = [];
        if (userLocation) markers.push({ latitude: userLocation.latitude, longitude: userLocation.longitude });
        if (driverLocation) markers.push({ latitude: driverLocation.latitude, longitude: driverLocation.longitude });
        if (currentRide?.status === 'driver_assigned' || currentRide?.status === 'driver_arrived') {
             // Show rider and driver during pickup
             if (pickupLocation?.geo?.coordinates) markers.push({ latitude: pickupLocation.geo.coordinates[1], longitude: pickupLocation.geo.coordinates[0] });
        } else if (currentRide?.status === 'in-progress') {
            // Show driver and dropoff during ride
             if (dropoffLocation?.geo?.coordinates) markers.push({ latitude: dropoffLocation.geo.coordinates[1], longitude: dropoffLocation.geo.coordinates[0] });
        } else if (currentScreen === 'HOME' || currentScreen === 'REQUESTING') {
             // Show pickup and dropoff markers before ride starts
              if (pickupLocation?.geo?.coordinates) markers.push({ latitude: pickupLocation.geo.coordinates[1], longitude: pickupLocation.geo.coordinates[0] });
              if (dropoffLocation?.geo?.coordinates) markers.push({ latitude: dropoffLocation.geo.coordinates[1], longitude: dropoffLocation.geo.coordinates[0] });
        }


        if (markers.length > 0) {
            mapRef.current.fitToCoordinates(markers, {
                edgePadding: { top: 100, right: 50, bottom: 50, left: 50 },
                animated: true,
            });
        }
    }, [userLocation, driverLocation, currentRide, currentScreen]); // Re-fit map when relevant locations change


    // --- Render Logic ---
    const renderContent = () => {
        switch (currentScreen) {
            case 'HOME':
            case 'REQUESTING': // Show request form while requesting too
                return (
                    <View style={styles.formContainer}>
                        <Text style={styles.label}>Pickup Location</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="e.g., 123 Main St"
                            value={pickupLocation.address}
                            onChangeText={(text) => setPickupLocation(prev => ({ ...prev, address: text }))} // Simple address update for demo
                        />
                        <Text style={styles.label}>Dropoff Location</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="e.g., 456 Market St"
                            value={dropoffLocation.address}
                             onChangeText={(text) => setDropoffLocation(prev => ({ ...prev, address: text }))} // Simple address update for demo
                        />
                        <TouchableOpacity
                            style={[styles.button, isLoading && styles.buttonDisabled]}
                            onPress={handleRequestRide}
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <ActivityIndicator color={THEME.buttonText} />
                            ) : (
                                <Text style={styles.buttonText}>Request Ride</Text>
                            )}
                        </TouchableOpacity>
                         {currentScreen === 'REQUESTING' && <Text style={styles.infoText}>Finding your ride...</Text>}
                    </View>
                );
            case 'WAITING':
                return (
                    <View style={styles.statusContainer}>
                        <ActivityIndicator size="large" color={THEME.accent} />
                        <Text style={styles.statusTitle}>Waiting for Driver</Text>
                         {currentRide?.vehicleDetails && (
                            <Text style={styles.infoText}>
                                Driver: {currentRide.driverId?.slice(-6) ?? 'N/A'} | Vehicle: {currentRide.vehicleDetails.color ?? ''} {currentRide.vehicleDetails.make ?? ''} {currentRide.vehicleDetails.model ?? ''} ({currentRide.vehicleDetails.licensePlate ?? 'N/A'})
                            </Text>
                        )}
                        <Text style={styles.infoText}>{statusMessage}</Text>
                         {currentRide?.status === 'driver_arrived' && (
                           <TouchableOpacity style={styles.button} onPress={() => setShowOtpModal(true)}>
                               <Text style={styles.buttonText}>Show OTP</Text>
                           </TouchableOpacity>
                         )}
                    </View>
                );
             case 'ON_RIDE':
                 return (
                     <View style={styles.statusContainer}>
                         <Text style={styles.statusTitle}>Ride in Progress</Text>
                         <Text style={styles.infoText}>Heading to: {currentRide?.dropoffLocation?.address || 'Destination'}</Text>
                          {currentRide?.vehicleDetails && (
                              <Text style={styles.infoText}>
                                  Vehicle: {currentRide.vehicleDetails.color ?? ''} {currentRide.vehicleDetails.make ?? ''} ({currentRide.vehicleDetails.licensePlate ?? 'N/A'})
                              </Text>
                          )}
                         <Text style={styles.infoText}>{statusMessage}</Text>
                     </View>
                 );
            case 'COMPLETED':
                 return (
                     <View style={styles.statusContainer}>
                         <Text style={styles.statusTitle}>Ride Completed</Text>
                         <Text style={styles.infoText}>Fare: {currentRide?.fare?.amount || 'N/A'} {currentRide?.fare?.currency || ''}</Text>
                         <Text style={styles.infoText}>{statusMessage}</Text>
                     </View>
                 );
            default:
                return null;
        }
    };

     // Memoize map markers to prevent unnecessary re-renders
     const markers = useMemo(() => {
         const m = [];
         if (userLocation) {
             m.push(
                 <Marker
                     key="rider"
                     coordinate={userLocation}
                     title="Your Location"
                     pinColor={THEME.accent} // Rider is teal
                 />
             );
         }
         if (driverLocation && (currentScreen === 'WAITING' || currentScreen === 'ON_RIDE')) {
             m.push(
                 <Marker
                     key="driver"
                     coordinate={driverLocation}
                     title="Driver"
                     description={currentRide?.vehicleDetails?.licensePlate ?? ''}
                     // Use a different color or custom icon for driver
                     pinColor="blue" // Driver is blue
                 >
                     {/* Optional custom view */}
                      <View style={styles.carIcon}>
                         <Text>🚗</Text>
                     </View>
                 </Marker>
             );
         }
         // Add pickup/dropoff markers if needed for context
          if (currentScreen === 'HOME' || currentScreen === 'REQUESTING' || currentScreen === 'WAITING') {
             if(pickupLocation?.geo?.coordinates) {
                  m.push(
                      <Marker
                          key="pickup"
                          coordinate={{ latitude: pickupLocation.geo.coordinates[1], longitude: pickupLocation.geo.coordinates[0] }}
                          title="Pickup"
                          description={pickupLocation.address}
                          pinColor="green" // Pickup is green
                      />
                  );
             }
         }
          if (currentScreen === 'HOME' || currentScreen === 'REQUESTING' || currentScreen === 'ON_RIDE') {
              if (dropoffLocation?.geo?.coordinates) {
                   m.push(
                       <Marker
                           key="dropoff"
                           coordinate={{ latitude: dropoffLocation.geo.coordinates[1], longitude: dropoffLocation.geo.coordinates[0] }}
                           title="Dropoff"
                           description={dropoffLocation.address}
                           pinColor="red" // Dropoff is red
                       />
                   );
              }
          }

         return m;
     }, [userLocation, driverLocation, currentScreen, currentRide, pickupLocation, dropoffLocation]);


    return (
        <SafeAreaView style={styles.safeArea}>
            <StatusBar barStyle={Platform.OS === 'ios' ? 'dark-content' : 'default'} backgroundColor={THEME.background} />
            <View style={styles.container}>
                <MapView
                    ref={mapRef}
                    style={styles.map}
                    initialRegion={userLocation ? {
                        ...userLocation,
                        latitudeDelta: 0.0922,
                        longitudeDelta: 0.0421,
                    } : { // Default region if location fails
                         latitude: 40.7128,
                         longitude: -74.0060,
                         latitudeDelta: 0.0922,
                         longitudeDelta: 0.0421,
                    }}
                    showsUserLocation={true}
                    followsUserLocation={currentScreen === 'HOME'} // Follow only when not in a ride
                    loadingEnabled={true}
                >
                    {markers}
                    {/* Optional: Draw Polyline for route - requires Directions API */}
                </MapView>

                <View style={styles.contentOverlay}>
                    <ScrollView contentContainerStyle={styles.scrollContent}>
                         {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
                        {renderContent()}
                    </ScrollView>
                </View>

                 {/* Status Bar at the bottom */}
                 <View style={styles.statusBar}>
                     <Text style={styles.statusTextContent}>{statusMessage}</Text>
                 </View>

                 {/* OTP Modal */}
                  <Modal
                      animationType="slide"
                      transparent={true}
                      visible={showOtpModal}
                      onRequestClose={() => {
                          setShowOtpModal(false);
                      }}
                  >
                      <View style={styles.modalCenteredView}>
                          <View style={styles.modalView}>
                              <Text style={styles.modalTitle}>Driver Arrived!</Text>
                              <Text style={styles.modalText}>Please share this OTP with your driver:</Text>
                              <Text style={styles.otpText}>{otp || '----'}</Text>
                              <TouchableOpacity
                                  style={[styles.button, styles.modalButton]}
                                  onPress={() => setShowOtpModal(false)}
                              >
                                  <Text style={styles.buttonText}>Close</Text>
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
    map: {
        ...StyleSheet.absoluteFillObject, // Map takes full screen background
    },
    contentOverlay: {
        position: 'absolute',
        bottom: 60, // Leave space for status bar
        left: 0,
        right: 0,
        maxHeight: Dimensions.get('window').height * 0.4, // Limit height
        backgroundColor: THEME.background + 'E6', // Slightly transparent white
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        paddingTop: 15,
        paddingBottom: Platform.OS === 'ios' ? 20 : 15, // Adjust for safe area if needed
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: -2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 5,
    },
     scrollContent: {
       paddingHorizontal: 20,
       paddingBottom: 20, // Extra padding at the bottom of scroll
   },
    formContainer: {
        width: '100%',
    },
    statusContainer: {
       alignItems: 'center',
        paddingVertical: 20,
   },
    label: {
        fontSize: 16,
        color: THEME.text,
        marginBottom: 5,
        fontWeight: '500',
    },
    input: {
        backgroundColor: THEME.inputBackground,
        borderWidth: 1,
        borderColor: THEME.muted,
        borderRadius: 8,
        paddingHorizontal: 15,
        paddingVertical: 12,
        fontSize: 16,
        marginBottom: 15,
        color: THEME.text,
    },
    button: {
        backgroundColor: THEME.accent,
        paddingVertical: 15,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: 10,
        shadowColor: THEME.secondary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
        elevation: 3,
    },
    buttonDisabled: {
        backgroundColor: THEME.muted,
        elevation: 0,
    },
    buttonText: {
        color: THEME.buttonText,
        fontSize: 18,
        fontWeight: 'bold',
    },
    statusBar: {
       position: 'absolute',
       bottom: 0,
       left: 0,
       right: 0,
       backgroundColor: THEME.secondary,
       paddingVertical: 10,
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
        marginBottom: 10,
        fontSize: 14,
    },
     infoText: {
         color: THEME.text,
         textAlign: 'center',
         marginTop: 10,
         fontSize: 15,
         lineHeight: 22,
     },
      statusTitle: {
          fontSize: 20,
          fontWeight: 'bold',
          color: THEME.text,
          marginBottom: 15,
          textAlign: 'center',
      },
     carIcon: {
        // Style for custom car marker if needed
        padding: 5,
        backgroundColor: 'lightblue',
        borderRadius: 5,
     },
      // Modal Styles
     modalCenteredView: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        marginTop: 22,
        backgroundColor: 'rgba(0,0,0,0.5)', // Dim background
    },
    modalView: {
        margin: 20,
        backgroundColor: THEME.primary,
        borderRadius: 20,
        padding: 35,
        alignItems: "center",
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 2
        },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
        width: '80%',
    },
     modalTitle: {
         marginBottom: 15,
         textAlign: "center",
         fontSize: 20,
         fontWeight: "bold",
         color: THEME.text,
     },
    modalText: {
        marginBottom: 15,
        textAlign: "center",
        fontSize: 16,
         color: THEME.text,
    },
     otpText: {
         marginBottom: 25,
         textAlign: "center",
         fontSize: 30,
         fontWeight: "bold",
         color: THEME.accent,
         letterSpacing: 5,
     },
      modalButton: {
          width: '80%', // Make button wider in modal
          marginTop: 10,
      }
});
