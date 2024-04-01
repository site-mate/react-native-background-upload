/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 * @flow
 */

import React, {useState} from 'react';

import {
  SafeAreaView,
  StyleSheet,
  ScrollView,
  View,
  Text,
  StatusBar,
  Button,
  Platform,
  TouchableOpacity,
  NativeModules,
} from 'react-native';

import {Header, Colors} from 'react-native/Libraries/NewAppScreen';

import Upload from 'react-native-background-upload';

import ImagePicker from 'react-native-image-crop-picker';

import RNFS from 'react-native-fs';

const url10SecDelayPut = 'http://localhost:8080/10secDelay';
const url5secDelayFail = 'http://localhost:8080/5secDelayFail';

const path = RNFS.TemporaryDirectoryPath + '/test.json';
const prefix = Platform.OS === 'ios' ? 'file://' : '';

const commonOptions = {
  url: '',
  path: prefix + path,
  method: 'PUT',
  type: 'raw',
  // only supported on Android
  notification: {
    enabled: true,
  },
};

RNFS.writeFile(path, '');
console.log(NativeModules.RNFileUploader);

const App = () => {
  const [delay10Completed, set10SecDelayCompleted] = useState(false);
  const [delay5Completed, set5SecDelayCompleted] = useState(false);

  const [isImagePickerShowing, setIsImagePickerShowing] = useState(false);
  const [uploadId, setUploadId] = useState(null);
  const [progress, setProgress] = useState(null);

  const onPressUpload = async options => {
    if (isImagePickerShowing) {
      return;
    }

    setIsImagePickerShowing(true);

    const [galleryMedia] = await ImagePicker.openPicker({
      multiple: true,
      includeExif: true,
      maxFiles: 1,
      writeTempFile: false, // note: this would be handy, but is iOS only :-(
    }).catch(e => {
      console.warn(e);
      setIsImagePickerShowing(false);
    });

    const finalPath = (galleryMedia.path || galleryMedia.uri).replace(
      'file://',
      '',
    );

    console.log('media!', galleryMedia);
    console.log('media path', finalPath);

    setIsImagePickerShowing(false);

    Upload.getFileInfo(finalPath).then(metadata => {
      const uploadOpts = Object.assign(
        {
          path: finalPath,
          method: 'POST',
          headers: {
            'content-type': metadata.mimeType, // server requires a content-type header
          },
        },
        options,
      );

      Upload.startUpload(uploadOpts)
        .then(uploadId => {
          console.log(
            `Upload started with options: ${JSON.stringify(uploadOpts)}`,
          );
          setUploadId(uploadId);
          setProgress(0);
          Upload.addListener('progress', uploadId, data => {
            if (data.progress % 5 === 0) {
              setProgress(+data.progress);
            }
            console.log(`Progress: ${data.progress}%`);
          });
          Upload.addListener('error', uploadId, data => {
            console.log(`Error: ${data.error}%`);
          });
          Upload.addListener('completed', uploadId, data => {
            console.log('Completed!');
          });
        })
        .catch(function (err) {
          setUploadId(null);
          setProgress(null);
          console.log('Upload error!', err);
        });
    });
  };

  return (
    <>
      <StatusBar barStyle="dark-content" />
      <SafeAreaView testID="main_screen">
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          style={styles.scrollView}>
          <Header />
          {global.HermesInternal == null ? null : (
            <View style={styles.engine}>
              <Text style={styles.footer}>Engine: Hermes</Text>
            </View>
          )}
          <View style={styles.body}>
            <View style={styles.sectionContainer}>
              <TouchableOpacity
                testID="10_sec_delay_button"
                onPress={() => {
                  const options = {
                    ...commonOptions,
                    url: url10SecDelayPut,
                  };

                  Upload.startUpload(options)
                    .then(uploadId => {
                      console.warn(uploadId);
                      setUploadId(uploadId);

                      Upload.addListener(
                        'completed',
                        uploadId,
                        ({responseCode}) => {
                          console.warn({responseCode});

                          if (responseCode <= 299) {
                            set10SecDelayCompleted(true);
                          }
                        },
                      );
                    })
                    .catch(err => {
                      console.warn(err.message);
                    });
                }}>
                <Text>10 Sec Delay Success</Text>
              </TouchableOpacity>

              {delay10Completed && (
                <View testID="10_sec_delay_completed">
                  <Text>Finished!!!</Text>
                </View>
              )}
            </View>
            <View style={styles.sectionContainer}>
              <TouchableOpacity
                testID="5_sec_delay_button"
                onPress={() => {
                  const options = {
                    ...commonOptions,
                    url: url5secDelayFail,
                  };

                  Upload.startUpload(options)
                    .then(uploadId => {
                      console.warn(uploadId);
                      setUploadId(uploadId);

                      Upload.addListener(
                        'completed',
                        uploadId,
                        ({responseCode}) => {
                          console.warn(responseCode);
                          if (responseCode === 502) {
                            set5SecDelayCompleted(true);
                          }
                        },
                      );

                      Upload.addListener(
                        'error',
                        uploadId,
                        ({responseCode}) => {
                          set5SecDelayCompleted(true);
                        },
                      );
                    })
                    .catch(err => {
                      console.warn(err.message);
                    });
                }}>
                <Text>5 Sec Delay Error</Text>
              </TouchableOpacity>

              {delay5Completed && (
                <View testID="5_sec_delay_completed">
                  <Text>Finished!!!</Text>
                </View>
              )}

              <Button
                title="Tap To Upload Multipart"
                onPress={() => {
                  onPressUpload({
                    url: `http://192.168.31.9:8080/upload_multipart`,
                    field: 'uploaded_media',
                    type: 'multipart',
                  });
                }}
              />

              <View style={{height: 32}} />
              <Text style={{textAlign: 'center'}}>
                {`Current Upload ID: ${uploadId === null ? 'none' : uploadId}`}
              </Text>
              <Text style={{textAlign: 'center'}}>
                {`Progress: ${progress === null ? 'none' : `${progress}%`}`}
              </Text>
              <View />
              <Button
                testID="cancel_button"
                title="Tap to Cancel Upload"
                onPress={() => {
                  if (!uploadId) {
                    console.log('Nothing to cancel!');
                    return;
                  }

                  Upload.cancelUpload(uploadId).then(() => {
                    console.log(`Upload ${uploadId} canceled`);
                    setUploadId(null);
                    setProgress(null);
                  });
                }}
              />
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </>
  );
};

const styles = StyleSheet.create({
  scrollView: {
    backgroundColor: Colors.lighter,
  },
  engine: {
    position: 'absolute',
    right: 0,
  },
  body: {
    backgroundColor: Colors.white,
  },
  sectionContainer: {
    marginTop: 32,
    paddingHorizontal: 24,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: Colors.black,
  },
  sectionDescription: {
    marginTop: 8,
    fontSize: 18,
    fontWeight: '400',
    color: Colors.dark,
  },
  highlight: {
    fontWeight: '700',
  },
  footer: {
    color: Colors.dark,
    fontSize: 12,
    fontWeight: '600',
    padding: 4,
    paddingRight: 12,
    textAlign: 'right',
  },
});

export default App;
