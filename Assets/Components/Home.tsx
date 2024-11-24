import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Modal,
  TouchableOpacity,
  Platform,
  PermissionsAndroid,
  ScrollView,
  Image,
} from 'react-native';
import SmsListener from 'react-native-android-sms-listener';

import trainIcon from '../Images/train.png';
import locationIcon from '../Images/location.png';
import timeIcon from '../Images/time.png';
import seatIcon from '../Images/seat.png';
import trainCoachesIcon from '../Images/train_coaches.png';
import messageIcon from '../Images/message.png';
import searchIcon from '../Images/search.png';
import trainsData from '../Data/trains.json'; // Import the trains.json file


const fetchTrainDetails = async (pnr: string) => {
  try {
    const train = trainsData.find((train) => train.pnr === pnr); // Search in the JSON data
    if (train) {
      return train; // Return the train details if found
    } else {
      throw new Error('Train details not found for the provided PNR.');
    }
  } catch (error) {
    throw new Error('Unable to fetch train details. Please check the PNR.');
  }
};

const Home: React.FC = () => {
  const [pnr, setPnr] = useState('');
  const [pnrError, setPnrError] = useState<string | null>(null);
  const [trainDetails, setTrainDetails] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [lastMessage, setLastMessage] = useState<string | null>(null);
  const [waitingForSms, setWaitingForSms] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

  const intervalId = useRef<NodeJS.Timeout | null>(null);
  const smsSubscription = useRef<any>(null);
  const timeoutId = useRef<NodeJS.Timeout | null>(null);

  const requestSmsPermission = async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.RECEIVE_SMS,
          {
            title: 'SMS Permission',
            message:
              'This app needs access to your SMS messages to fetch PNR details.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (err) {
        console.warn(err);
        return false;
      }
    }
    return false;
  };

  useEffect(() => {
    const initSmsPermission = async () => {
      const permissionGranted = await requestSmsPermission();
      if (!permissionGranted) {
        Alert.alert(
          'Permission Denied',
          'Cannot access SMS messages without permission.'
        );
      }
    };
    initSmsPermission();

    return () => {
      stopPolling();
      clearWaitingForSms();
      if (timeoutId.current) {
        clearTimeout(timeoutId.current);
      }
    };
  }, []);

  const validatePnr = (pnrInput: string): boolean => {
    if (!pnrInput || pnrInput.trim() === '') {
      setPnrError('PNR cannot be empty.');
      setTrainDetails(null); // Clear train details on validation failure
      return false;
    }
    if (!/^\d{10}$/.test(pnrInput)) {
      setPnrError('PNR must be a valid 10-digit number.');
      setTrainDetails(null); // Clear train details on validation failure
      return false;
    }
    setPnrError(null);
    return true;
  };

  const handlePnrChange = (input: string) => {
    setPnr(input);
    validatePnr(input);
  };

  const searchTrain = async (pnrToSearch = pnr) => {
    if (!validatePnr(pnrToSearch)) {
      setTrainDetails(null); // Clear previous train details
      Alert.alert('Invalid PNR', pnrError || 'Please enter a valid PNR number.');
      return;
    }
  
    setLoading(true);
    try {
      console.log('Searching for PNR:', pnrToSearch); // Debugging log
  
      const result = await fetchTrainDetails(pnrToSearch);
      if (result) {
        console.log('Train details found:', result); // Debugging log
        setTrainDetails(result); // Display train details only when found
        startPolling(pnrToSearch);
      } else {
        setTrainDetails(null); // Clear train details if no result is found
        Alert.alert('No Train Found', 'Please check the PNR number and try again.');
      }
    } catch (error) {
      console.error('Error fetching train details:', error.message); // Log the error
      setTrainDetails(null); // Clear train details on error
      Alert.alert('Error', error.message || 'Something went wrong while fetching train details.');
    } finally {
      setLoading(false);
    }
  };

  const extractPnrFromSms = (message: string) => {
    const match = message.match(/PNR[^\d]*(\d{10})/i); // Match 'PNR' followed by a 10-digit number
    return match ? match[1] : null;
  };

  const fetchPnrFromSms = async () => {
    setWaitingForSms(true);
    setModalVisible(true);
  
    smsSubscription.current = SmsListener.addListener((message) => {
      clearWaitingForSms();
      setLastMessage(message.body);
  
      console.log('Received SMS:', message.body); // Debugging log
  
      const extractedPnr = extractPnrFromSms(message.body);
      console.log('Extracted PNR:', extractedPnr); // Log the extracted PNR
  
      if (extractedPnr !== null && extractedPnr !== undefined) {
        setPnr(extractedPnr);
        Alert.alert('PNR Detected', `Detected PNR from SMS: ${extractedPnr}`);
        searchTrain(extractedPnr); // Call searchTrain with the extracted PNR
      } else {
        Alert.alert('PNR Not Found', 'No PNR found in the recent SMS.');
      }
  
      if (timeoutId.current) {
        clearTimeout(timeoutId.current);
      }
    });
  
    timeoutId.current = setTimeout(() => {
      clearWaitingForSms();
      Alert.alert(
        'No Message Detected',
        'No SMS with PNR received within 10 seconds.'
      );
    }, 10000);
  };

  const startPolling = (pnr: string) => {
    if (intervalId.current) {
      clearInterval(intervalId.current);
    }
    intervalId.current = setInterval(async () => {
      try {
        const result = await fetchTrainDetails(pnr);
        if (result) {
          setTrainDetails(result);
        }
      } catch (error) {
        console.error('Error during polling:', error.message);
        stopPolling();
      }
    }, 1000);
  };

  const stopPolling = () => {
    if (intervalId.current) {
      clearInterval(intervalId.current);
      intervalId.current = null;
    }
  };

  const clearWaitingForSms = () => {
    if (smsSubscription.current) {
      smsSubscription.current.remove();
      smsSubscription.current = null;
    }
    setWaitingForSms(false);
    setModalVisible(false);
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>
        <Image source={trainIcon} style={styles.icon} /> Train PNR Status
      </Text>

      <View style={styles.searchContainer}>
        <TextInput
          style={[
            styles.input,
            pnrError ? { borderColor: 'red', borderWidth: 1 } : null,
          ]}
          placeholder="Enter PNR Number"
          value={pnr}
          onChangeText={handlePnrChange}
          keyboardType="numeric"
          editable={!waitingForSms}
        />
        <TouchableOpacity
          style={styles.searchButton}
          onPress={() => searchTrain()}
          disabled={loading || waitingForSms}
          activeOpacity={0.7}
        >
          <Image source={searchIcon} style={styles.iconSmall} />
          <Text style={styles.searchButtonText}>
            {loading ? 'Searching...' : 'Search'}
          </Text>
        </TouchableOpacity>
      </View>

      {pnrError && <Text style={styles.errorText}>{pnrError}</Text>}

      <TouchableOpacity
        style={styles.actionButton}
        onPress={fetchPnrFromSms}
        disabled={loading || waitingForSms}
      >
        <Text style={styles.actionButtonText}>Fetch PNR from SMS</Text>
      </TouchableOpacity>

      {lastMessage && (
        <View style={styles.smsContainer}>
          <Text style={styles.smsTitle}>
            <Image source={messageIcon} style={styles.iconSmall} /> Last SMS Message
          </Text>
          <Text>{lastMessage}</Text>
        </View>
      )}

      {trainDetails && (
        <View style={styles.detailsContainer}>
          <Text style={styles.detailsTitle}>
            <Image source={trainIcon} style={styles.iconSmall} /> Train Details
          </Text>
          <Text style={styles.detailItem}>
            <Image source={trainCoachesIcon} style={styles.iconSmall} /> Train Name: {trainDetails.trainName}
          </Text>
          <Text style={styles.detailItem}>
            <Image source={locationIcon} style={styles.iconSmall} /> Current Location: {trainDetails.currentLocation}
          </Text>
          <Text style={styles.detailItem}>
            <Image source={timeIcon} style={styles.iconSmall} /> Estimated Arrival: {trainDetails.estimatedArrival}
          </Text>
          <Text style={styles.detailItem}>
            <Image source={seatIcon} style={styles.iconSmall} /> Seat Details: {trainDetails.seatDetails}
          </Text>
        </View>
      )}

      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={clearWaitingForSms}
      >
        <View style={styles.modalBackground}>
          <View style={styles.modalContainer}>
            <ActivityIndicator size="large" color="#007bff" />
            <Text style={styles.modalText}>Waiting for SMS...</Text>
            <TouchableOpacity onPress={clearWaitingForSms} style={styles.cancelButton}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};



const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 20,
    backgroundColor: '#f2f5f8',
    justifyContent: 'flex-start',
  },
  errorText: {
    color: 'red',
    fontSize: 14,
    marginTop: -10,
    marginBottom: 10,
    textAlign: 'left',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 30,
    textAlign: 'center',
    color: '#333',
  },
  icon: {
    width: 30,
    height: 30,
    marginRight: 10,
  },
  iconSmall: {
    width: 20,
    height: 20,
    marginRight: 5,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    elevation: 3,
    marginBottom: 20,
    paddingHorizontal: 10,
    paddingRight: 5,
  },
  input: {
    flex: 1,
    height: 50,
    borderRadius: 12,
    paddingHorizontal: 15,
    fontSize: 16,
    backgroundColor: '#fff',
    marginRight: 10,
  },
  searchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 15,
    backgroundColor: '#1e88e5',
    borderRadius: 12,
  },
  searchButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  actionButton: {
    backgroundColor: '#007bff',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    elevation: 2,
    marginBottom: 20,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  smsContainer: {
    marginTop: 20,
    padding: 15,
    backgroundColor: '#e6f7ff',
    borderRadius: 12,
    borderColor: '#91d5ff',
    borderWidth: 1,
  },
  smsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#0050b3',
  },
  detailsContainer: {
    marginTop: 30,
    padding: 20,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderColor: '#d9d9d9',
    borderWidth: 1,
  },
  detailsTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#262626',
    textAlign: 'center',
  },
  detailItem: {
    fontSize: 18,
    marginBottom: 8,
    color: '#595959',
    flexDirection: 'row',
    alignItems: 'center',
  },
  guideTitle: {
    marginTop: 20,
    fontSize: 20,
    fontWeight: 'bold',
    color: '#3f6600',
    textAlign: 'center',
  },
  guideText: {
    fontSize: 18,
    marginTop: 10,
    color: '#595959',
    textAlign: 'center',
  },
  modalBackground: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  modalContainer: {
    width: 270,
    padding: 25,
    backgroundColor: '#fff',
    borderRadius: 16,
    alignItems: 'center',
    elevation: 10,
  },
  modalText: {
    marginTop: 15,
    fontSize: 18,
    color: '#1e88e5',
    fontWeight: '600',
    textAlign: 'center',
  },
  cancelButton: {
    marginTop: 25,
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: '#ff5252',
    borderRadius: 8,
    width: '80%',
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default Home;
