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
  View,
  Text,
  Button,
  Platform,
} from 'react-native';

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

async function upload(params, setUploadId, setProgress) {
  const {url, path, method, type, field, headers = {}, ...rest} = params;
  const uploadId = await Upload.startUpload({
    url,
    path,
    method,
    type,
    headers,
    field,
    ...rest,
    // (Android only)
    notification: {
      enabled: true,
      autoClear: true,
    },
  });
  setUploadId(uploadId);
  setProgress(0);
  return new Promise(resolve => {
    Upload.addListener('error', uploadId, data => {
      console.log(`NetworkService.bgUpload error ${data.error}`, {
        data,
        uploadId,
      });
      resolve({
        rawResponse: data.error,
        responseBody: this.getBgUploadErrorMessage(data.error),
        responseCode: 400,
      });
    });
    Upload.addListener('cancelled', uploadId, data => {
      console.log('NetworkService.bgUpload cancelled', {data, uploadId});
      resolve({
        responseBody: 'Request cancelled',
        responseCode: 400,
      });
    });
    Upload.addListener('completed', uploadId, data => {
      console.log('NetworkService.bgUpload completed', {data, uploadId});
      resolve({
        responseBody: data.responseBody,
        responseCode: data.responseCode,
        responseHeaders: data.responseHeaders,
      });
    });
    if (__DEV__) {
      Upload.addListener('progress', uploadId, data => {
        if (data.progress % 5 === 0) {
          setProgress(+data.progress);
        }
        console.log(`Progress: ${data.progress}%`);
      });
    }
  });
}

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

    const files = await ImagePicker.openPicker({
      multiple: true,
      includeExif: true,
      maxFiles: 1,
      writeTempFile: false, // note: this would be handy, but is iOS only :-(
    }).catch(e => {
      console.warn(e);
      setIsImagePickerShowing(false);
    });

    setIsImagePickerShowing(false);

    for await (const galleryMedia of files) {
      const finalPath = (galleryMedia.path || galleryMedia.uri).replace(
        'file://',
        '',
      );

      const metadata = await Upload.getFileInfo(finalPath);

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

      try {
        await upload(uploadOpts, setUploadId, setProgress);
      } catch (e) {
        setUploadId(null);
        setProgress(null);
        console.log('Upload error!', e);
      }
    }
  };

  return (
    <>
      <SafeAreaView testID="main_screen" style={{flex: 1}}>
        <View style={styles.body}>
          <View style={styles.sectionContainer}>
            <Button
              title="10 Sec Delay Success"
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
              }}
            />

            {delay10Completed && (
              <View testID="10_sec_delay_completed">
                <Text>Finished!!!</Text>
              </View>
            )}
          </View>
          <View style={styles.sectionContainer}>
            <Button
              testID="5_sec_delay_button"
              title="5 Sec Delay Error"
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

                    Upload.addListener('error', uploadId, ({responseCode}) => {
                      set5SecDelayCompleted(true);
                    });
                  })
                  .catch(err => {
                    console.warn(err.message);
                  });
              }}
            />

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
      </SafeAreaView>
    </>
  );
};

const styles = StyleSheet.create({
  body: {
    flex: 1,
  },
  sectionContainer: {
    marginTop: 32,
    paddingHorizontal: 24,
  },
});

export default App;
