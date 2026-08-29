import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  BackHandler,
  Image,
  Keyboard,
  Modal,
  PermissionsAndroid,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import LottieView from 'lottie-react-native';
import { Camera as CameraIcon, Check, ChevronRight, FileImage, History, ImagePlus, Mic, Send, Sparkles, X } from 'lucide-react-native';
import { Camera, useCameraDevice, useCameraPermission, usePhotoOutput } from 'react-native-vision-camera';
import { launchImageLibrary } from 'react-native-image-picker';
import { addHistoryItem } from '../store/slices/historySlice';
import { visionApi } from '../services/api/visionApi';
import { startNativeVoiceRecognition, stopNativeVoiceRecognition } from '../services/api/localLLMService';
import scanLoader from '../assets/scan-loader.json';

const yellow = '#FFC400';

const HomeScreen = () => {
  const device = useCameraDevice('back');
  const photoOutput = usePhotoOutput();
  const { hasPermission, requestPermission } = useCameraPermission();
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch();
  const history = useSelector(state => state.history?.items || []);
  const [screen, setScreen] = useState('home');
  const [imageUri, setImageUri] = useState(null);
  const [imageConfirmed, setImageConfirmed] = useState(false);
  const [ready, setReady] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [question, setQuestion] = useState('');
  const [submittedQuestion, setSubmittedQuestion] = useState('');
  const [listening, setListening] = useState(false);
  const [landing, setLanding] = useState(true);
  const [aiResponse, setAiResponse] = useState('');
  const [loadingAi, setLoadingAi] = useState(false);
  const input = useRef(null);

  const error = message => Alert.alert('Unable to continue', message);
  const addHistory = (uri, title) => {
    dispatch(addHistoryItem({
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      uri,
      title,
      time: 'Just now',
      createdAt: Date.now(),
    }));
  };

  const submit = async value => {
    const text = (value ?? question).trim();
    if (!text) return;
    setQuestion('');
    setSubmittedQuestion(text);
    setLoadingAi(true);
    console.log('[VisionIQ] Submitting Chat Question:', text, 'for imageUri:', imageUri);
    try {
      const res = await visionApi.askChat({ sessionId: `session_${Date.now()}`, message: text, imageUri });
      console.log('[VisionIQ] askChat Response Received:', res);
      const ans = res.answer || res.result?.summary || (typeof res === 'string' ? res : JSON.stringify(res));
      setAiResponse(ans);
    } catch (err) {
      console.error('[VisionIQ] askChat Error:', err);
      setAiResponse(`Error analyzing question: ${err.message || err}`);
    } finally {
      setLoadingAi(false);
    }
  };

  const requestStoragePermission = async () => {
    if (Platform.OS !== 'android') return true;
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
        {
          title: 'Storage Permission Required',
          message: 'VisionIQ needs storage access to load the local Gemma model file from your Downloads folder.',
          buttonPositive: 'Allow',
          buttonNegative: 'Deny',
        }
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch (err) {
      console.warn('[HomeScreen] Storage permission request error:', err);
      return false;
    }
  };

  useEffect(() => {
    requestStoragePermission();
    const timer = setTimeout(() => setLanding(false), 900);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const onBack = () => {
      if (assistantOpen) { closeAssistant(); return true; }
      if (historyOpen) { setHistoryOpen(false); return true; }
      if (screen !== 'home') { setScreen('home'); return true; }
      return false;
    };
    const listener = BackHandler.addEventListener('hardwareBackPress', onBack);
    return () => listener.remove();
  }, [assistantOpen, historyOpen, screen]);

  const openCamera = async () => {
    try {
      if (!(hasPermission || await requestPermission())) return error('Camera permission is required to scan an image. Enable it in Settings and try again.');
      setReady(false); setScreen('camera');
    } catch (e) { error(e.message || 'The camera could not be opened.'); }
  };
  const upload = async () => {
    try {
      const result = await launchImageLibrary({ mediaType: 'photo', selectionLimit: 1, includeBase64: false });
      if (result.didCancel) return;
      if (result.errorCode) return error(result.errorMessage || 'The image picker could not be opened.');
      const asset = result.assets?.[0];
      if (!asset?.uri) return error('No image was selected. Please choose an image and try again.');
      console.log('New image uploaded:', asset.uri);
      setImageUri(asset.uri); setImageConfirmed(false); setAiResponse(''); setSubmittedQuestion(''); addHistory(asset.uri, asset.fileName || 'Uploaded image'); setScreen('preview');
    } catch (e) { error(e.message || 'The image picker could not be opened.'); }
  };
  const capture = async () => {
    if (!ready || capturing) return;
    try {
      setCapturing(true);
      const file = await photoOutput.capturePhotoToFile({ flashMode: 'off' }, {});
      const uri = file.filePath.startsWith('file://') ? file.filePath : `file://${file.filePath}`;
      console.log('New image captured:', uri);
      setImageUri(uri); setImageConfirmed(false); setAiResponse(''); setSubmittedQuestion(''); addHistory(uri, 'Captured image'); setScreen('preview');
    } catch (e) { error(e.message || 'The photo could not be captured.'); } finally { setCapturing(false); }
  };
  const openAssistant = async () => {
    setImageConfirmed(true);
    setSubmittedQuestion('');
    setAssistantOpen(true);
    setTimeout(() => input.current?.focus(), 250);
    console.log('[VisionIQ] Tick button clicked. Triggering AI analysis for:', imageUri);
    setLoadingAi(true);
    try {
      const res = await visionApi.analyzeImage({ imageUri, source: 'upload' });
      console.log('[VisionIQ] analyzeImage Response Received:', res);
      const summaryText = res.result?.summary || res.answer || (typeof res === 'string' ? res : JSON.stringify(res));
      setAiResponse(summaryText);
    } catch (err) {
      console.error('[VisionIQ] analyzeImage Error:', err);
      setAiResponse(`Analysis failed: ${err.message || err}`);
    } finally {
      setLoadingAi(false);
    }
  };
  const closeAssistant = () => {
    stopNativeVoiceRecognition().catch(() => undefined);
    setListening(false);
    setAssistantOpen(false);
  };

  const listen = async () => {
    // Request mic permission first
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
          {
            title: 'Microphone Permission',
            message: 'VisionIQ needs microphone access to understand your voice questions.',
            buttonPositive: 'Allow',
            buttonNegative: 'Deny',
          }
        );
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          error('Microphone permission is required for voice input. Please enable it in Settings.');
          return;
        }
      } catch (permErr) {
        console.warn('[HomeScreen] Mic permission error:', permErr);
        return;
      }
    }

    try {
      setListening(true);
      const spokenText = await startNativeVoiceRecognition();
      setListening(false);
      if (spokenText?.trim()) {
        setQuestion('');
        setSubmittedQuestion(spokenText.trim());
        submit(spokenText.trim());
      }
    } catch (e) {
      setListening(false);
      console.warn('[HomeScreen] Voice recognition error:', e);
      error(e.message || 'Voice recognition could not start. Please type your question instead.');
    }
  };


  const discard = () => { closeAssistant(); setImageUri(null); setImageConfirmed(false); setQuestion(''); setSubmittedQuestion(''); setAiResponse(''); setLoadingAi(false); setScreen('home'); };

  if (screen === 'camera') return <SafeAreaView style={s.cameraScreen}>
    <StatusBar barStyle="light-content" backgroundColor="#000" />
    {device ? <Camera style={StyleSheet.absoluteFill} device={device} isActive outputs={[photoOutput]} onPreviewStarted={() => setReady(true)} onPreviewStopped={() => setReady(false)} onError={e => error(e.message || 'The camera could not be opened.')} /> : <View style={s.empty}><Text style={s.emptyText}>No back camera is available.</Text></View>}
    <TouchableOpacity onPress={() => setScreen('home')} style={[s.close, s.cameraScreenClose]}><X color="#fff" size={24} /></TouchableOpacity>
    <View style={s.cameraTip}><Sparkles color={yellow} size={15} /><Text style={s.cameraTipText}>Point at anything to explore</Text></View>
    <View pointerEvents="none" style={s.frame}><View style={[s.corner, s.tl]} /><View style={[s.corner, s.tr]} /><View style={[s.corner, s.bl]} /><View style={[s.corner, s.br]} /></View>
    <View style={s.cameraBar}><TouchableOpacity onPress={upload} style={s.uploadRound}><ImagePlus color="#fff" size={27} /><Text style={s.uploadText}>Upload</Text></TouchableOpacity><TouchableOpacity disabled={!ready || capturing} onPress={capture} style={[s.shutter, (!ready || capturing) && s.disabled]}>{capturing ? <LottieView autoPlay loop source={scanLoader} style={s.lottieSmall} /> : <View style={s.shutterCenter} />}</TouchableOpacity><View style={s.uploadRound} /></View>
  </SafeAreaView>;

  if (screen === 'preview' && imageUri) return <SafeAreaView style={s.previewScreen}>
    <StatusBar barStyle="light-content" backgroundColor="#000" /><Image source={{ uri: imageUri }} style={s.previewImage} resizeMode="contain" />
    <View style={s.previewHeader}><Text style={s.previewTitle}>Review image</Text><TouchableOpacity onPress={discard} style={s.close}><X color="#fff" size={24} /></TouchableOpacity></View>
    <View style={s.previewActions}><Text style={s.previewHint}>{imageConfirmed ? 'Choose another image or remove this one' : 'Image ready for analysis'}</Text>{imageConfirmed ? <View style={s.previewChoiceRow}><TouchableOpacity onPress={upload} style={s.previewSmallAction}><ImagePlus color="#fff" size={21} /></TouchableOpacity><TouchableOpacity onPress={discard} style={s.confirm}><X color="#090909" size={31} strokeWidth={3} /></TouchableOpacity><View style={s.previewSmallAction} /></View> : <TouchableOpacity onPress={openAssistant} style={s.confirm}><Check color="#090909" size={32} strokeWidth={3} /></TouchableOpacity>}</View>
    <AssistantSheet visible={assistantOpen} close={closeAssistant} imageUri={imageUri} input={input} question={question} setQuestion={setQuestion} submit={submit} listening={listening} listen={listen} submitted={submittedQuestion} loadingAi={loadingAi} aiResponse={aiResponse} />
  </SafeAreaView>;

  const recentHistory = history.slice(0, 5);

  return <SafeAreaView style={[s.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
    <StatusBar barStyle="light-content" backgroundColor="#050505" />
    <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
      <View style={s.logoBox}><Text style={s.logo}>VISION<Text style={s.yellow}>IQ</Text></Text><Text style={s.tagline}>SEE MORE. <Text style={s.yellow}>KNOW</Text> MORE. DO MORE.</Text></View>
      <TouchableOpacity onPress={openCamera} activeOpacity={0.9} style={s.hero}><View style={s.heroCopy}><Text style={s.heroWhite}>See More.</Text><Text style={s.heroYellow}>Know More.</Text><Text style={s.heroWhite}>Do More.</Text><Text style={s.heroText}>Your private visual assistant for understanding the world around you.</Text></View><View style={s.heroArt}><View style={s.ring1}><View style={s.ring2}><View style={s.ring3}><CameraIcon color={yellow} size={35} /></View></View></View><Sparkles color={yellow} size={23} style={s.spark} /></View></TouchableOpacity>
      <TouchableOpacity onPress={openCamera} style={s.scanTile}><View style={s.scanIcon}><CameraIcon color={yellow} size={28} /></View><View style={s.scanCopy}><Text style={s.scanTitle}>Scan & Analyze</Text><Text style={s.scanSub}>Tap to scan anything</Text></View><ChevronRight color={yellow} size={29} /></TouchableOpacity>
      <Text style={s.sectionTitle}>Recent scans</Text>
      {recentHistory.length ? recentHistory.map(item => <TouchableOpacity key={item.id} onPress={() => { setImageUri(item.uri); setScreen('preview'); }} style={s.historyCard}><Image source={{ uri: item.uri }} style={s.historyImage} /><View style={s.historyCopy}><Text style={s.historyTitle} numberOfLines={1}>{item.title}</Text><Text style={s.historySub}>Image · {item.time}</Text><Text style={s.badge}>Ready to analyze</Text></View><ChevronRight color="#777" size={27} /></TouchableOpacity>) : <View style={s.noHistory}><History color="#777" size={21} /><Text style={s.noHistoryText}>Your scanned images will appear here.</Text></View>}
    </ScrollView>
    <View style={s.dock}><Dock icon={<History size={25} />} label="History" onPress={() => setHistoryOpen(true)} /><Dock active icon={<CameraIcon size={27} />} label="Capture" onPress={openCamera} /><Dock icon={<FileImage size={25} />} label="Upload" onPress={upload} /></View>
    <HistorySheet visible={historyOpen} close={() => setHistoryOpen(false)} items={history} select={item => { setHistoryOpen(false); setImageUri(item.uri); setScreen('preview'); }} />
    {landing && <View style={s.landing}><LottieView autoPlay loop source={scanLoader} style={s.lottieLanding} /><Text style={s.loadingText}>Preparing VisionIQ</Text></View>}
  </SafeAreaView>;
};

const Dock = ({ active, icon, label, onPress }) => <TouchableOpacity accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={s.dockButton}><View style={[s.dockCircle, active && s.dockActive]}>{React.cloneElement(icon, { color: active ? '#080808' : '#bbb' })}</View></TouchableOpacity>;
const Sheet = ({ visible, close, children }) => <Modal transparent visible={visible} animationType="fade" onRequestClose={close}><Pressable style={s.backdrop} onPress={close}><Pressable style={s.sheet} onPress={() => undefined}>{children}</Pressable></Pressable></Modal>;
const HistorySheet = ({ visible, close, items, select }) => <Sheet visible={visible} close={close}><View style={s.handle} /><View style={s.sheetHead}><View><Text style={s.sheetTitle}>All recent scans</Text><Text style={s.sheetSub}>Your latest captures and uploads</Text></View><TouchableOpacity onPress={close} style={s.sheetClose}><X color="#fff" size={20} /></TouchableOpacity></View>{items.length ? <ScrollView style={s.historyList}>{items.map(item => <TouchableOpacity key={item.id} onPress={() => select(item)} style={s.sheetRow}><Image source={{ uri: item.uri }} style={s.sheetImage} /><View style={s.flex}><Text style={s.rowTitle}>{item.title}</Text><Text style={s.rowSub}>{item.time}</Text></View><ChevronRight color="#888" size={21} /></TouchableOpacity>)}</ScrollView> : <Text style={s.emptySheet}>No images yet. Capture or upload an image to start.</Text>}</Sheet>;
const AssistantSheet = ({ visible, close, imageUri, input, question, setQuestion, submit, listening, listen, submitted, loadingAi, aiResponse }) => {
  const [keyboardPadding, setKeyboardPadding] = useState(0);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, e => {
      setKeyboardPadding(e.endCoordinates.height);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardPadding(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  return (
    <Modal transparent visible={visible} animationType="slide" onRequestClose={close}>
      <View style={s.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={close} />
        <View style={{ width: '100%', paddingBottom: keyboardPadding, justifyContent: 'flex-end' }}>
          <View style={s.assistantSheet}>
            <View style={s.handle} />
            <View style={s.sheetHead}>
              <View style={s.assistantHead}>
                {imageUri ? <Image source={{ uri: imageUri }} style={s.thumb} /> : null}
                <View>
                  <Text style={s.sheetTitle}>Ask about this image</Text>
                  <Text style={s.sheetSub}>VisionIQ is ready to help</Text>
                </View>
              </View>
              <TouchableOpacity onPress={close} style={s.sheetClose}>
                <X color="#fff" size={20} />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 180, marginVertical: 10 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={true}>
              {submitted ? <Text style={s.submitted}>“{submitted}”</Text> : null}
              {loadingAi ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10 }}>
                  <ActivityIndicator color={yellow} size="small" style={{ marginRight: 8 }} />
                  <Text style={{ color: yellow, fontSize: 13, fontWeight: '600' }}>Analyzing image with Gemma AI...</Text>
                </View>
              ) : aiResponse ? (
                <View style={{ backgroundColor: '#222222', borderRadius: 12, padding: 12, marginTop: 10, borderColor: '#333333', borderWidth: 1 }}>
                  <Text style={{ color: '#F0F0F0', fontSize: 13, lineHeight: 19 }}>{aiResponse}</Text>
                </View>
              ) : null}
            </ScrollView>
            <View style={s.inputRow}>
              <TextInput ref={input} value={question} onChangeText={setQuestion} onSubmitEditing={() => submit()} placeholder="Ask anything about this image..." placeholderTextColor="#888" returnKeyType="send" style={s.input} />
              <TouchableOpacity onPress={listen} style={[s.mic, listening && s.micActive]}>
                <Mic color={listening ? '#080808' : yellow} size={21} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => submit()} style={s.send}>
                <Send color="#080808" size={18} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const s = StyleSheet.create({
  container:{flex:1,backgroundColor:'#050505'}, content:{paddingHorizontal:20,paddingBottom:112}, logoBox:{alignItems:'center',paddingBottom:22,paddingTop:22}, logo:{color:'#f5f5f5',fontSize:31,fontWeight:'900',letterSpacing:7},yellow:{color:yellow},tagline:{color:'#e2e2e2',fontSize:10,letterSpacing:1.15,marginTop:6},hero:{backgroundColor:'#121009',borderColor:'#866b00',borderRadius:25,borderWidth:1,flexDirection:'row',minHeight:250,overflow:'hidden',padding:24},heroCopy:{flex:1.12,justifyContent:'center'},heroWhite:{color:'#f8f8f8',fontSize:28,fontWeight:'800',lineHeight:37},heroYellow:{color:yellow,fontSize:28,fontWeight:'800',lineHeight:37},heroText:{color:'#d2d2d2',fontSize:14,lineHeight:21,marginTop:17},heroArt:{alignItems:'center',flex:0.88,justifyContent:'center'},ring1:{alignItems:'center',borderColor:yellow,borderRadius:72,borderWidth:2,height:140,justifyContent:'center',width:140},ring2:{alignItems:'center',borderColor:'#c59a00',borderRadius:54,borderWidth:6,height:108,justifyContent:'center',width:108},ring3:{alignItems:'center',backgroundColor:'#090909',borderColor:'#555',borderRadius:38,borderWidth:4,height:76,justifyContent:'center',width:76},spark:{position:'absolute',right:0,top:26},scanTile:{alignItems:'center',backgroundColor:'#101010',borderColor:'#383838',borderRadius:20,borderWidth:1,flexDirection:'row',marginTop:20,padding:15},scanIcon:{alignItems:'center',borderColor:'#806600',borderRadius:26,borderWidth:2,height:52,justifyContent:'center',width:52},scanCopy:{flex:1,marginLeft:14},scanTitle:{color:'#f4f4f4',fontSize:18,fontWeight:'700'},scanSub:{color:'#b5b5b5',fontSize:14,marginTop:3},sectionTitle:{color:'#f4f4f4',fontSize:20,fontWeight:'800',marginBottom:12,marginTop:25},noHistory:{alignItems:'center',backgroundColor:'#101010',borderColor:'#292929',borderRadius:18,borderWidth:1,flexDirection:'row',padding:18},noHistoryText:{color:'#a6a6a6',fontSize:14,marginLeft:10},historyCard:{alignItems:'center',backgroundColor:'#101010',borderColor:'#292929',borderRadius:18,borderWidth:1,flexDirection:'row',marginBottom:10,padding:10},historyImage:{borderRadius:11,height:72,width:72},historyCopy:{flex:1,marginHorizontal:12},historyTitle:{color:'#f5f5f5',fontSize:16,fontWeight:'700'},historySub:{color:'#aaa',fontSize:12,marginTop:4},badge:{alignSelf:'flex-start',backgroundColor:'#292516',borderRadius:9,color:yellow,fontSize:11,marginTop:7,paddingHorizontal:8,paddingVertical:3},dock:{alignItems:'center',backgroundColor:'#101010',borderColor:'#303030',borderRadius:28,borderWidth:1,bottom:20,flexDirection:'row',height:66,justifyContent:'space-around',left:27,position:'absolute',right:27},dockButton:{padding:8},dockCircle:{alignItems:'center',height:42,justifyContent:'center',width:42},dockActive:{backgroundColor:yellow,borderRadius:21},cameraScreen:{backgroundColor:'#000',flex:1},empty:{alignItems:'center',flex:1,justifyContent:'center'},emptyText:{color:'#fff'},close:{alignItems:'center',backgroundColor:'rgba(0,0,0,0.5)',borderRadius:22,height:44,justifyContent:'center',width:44},cameraScreenClose:{position:'absolute',right:22,top:18},cameraTip:{alignItems:'center',backgroundColor:'rgba(0,0,0,0.5)',borderRadius:16,flexDirection:'row',left:0,marginHorizontal:'auto',paddingHorizontal:12,paddingVertical:8,position:'absolute',right:0,top:72,width:225},cameraTipText:{color:'#fff',fontSize:12,marginLeft:6},frame:{bottom:'31%',height:240,left:42,position:'absolute',right:42},corner:{borderColor:yellow,height:44,position:'absolute',width:44},tl:{borderLeftWidth:4,borderTopWidth:4,left:0,top:0},tr:{borderRightWidth:4,borderTopWidth:4,right:0,top:0},bl:{borderBottomWidth:4,borderLeftWidth:4,bottom:0,left:0},br:{borderBottomWidth:4,borderRightWidth:4,bottom:0,right:0},cameraBar:{alignItems:'center',backgroundColor:'rgba(0,0,0,0.56)',bottom:0,flexDirection:'row',justifyContent:'space-around',left:0,paddingBottom:28,paddingTop:20,position:'absolute',right:0},uploadRound:{alignItems:'center',height:65,justifyContent:'center',width:72},uploadText:{color:'#fff',fontSize:12,marginTop:4},shutter:{alignItems:'center',backgroundColor:'#fff',borderColor:'rgba(255,255,255,0.6)',borderRadius:39,borderWidth:4,height:78,justifyContent:'center',width:78},shutterCenter:{backgroundColor:yellow,borderRadius:30,height:60,width:60},disabled:{opacity:0.55},lottieSmall:{height:60,width:60},previewScreen:{backgroundColor:'#000',flex:1},previewImage:{height:'100%',width:'100%'},previewHeader:{alignItems:'center',flexDirection:'row',justifyContent:'space-between',left:0,paddingHorizontal:22,position:'absolute',right:0,top:18},previewTitle:{color:'#fff',fontSize:17,fontWeight:'700'},previewActions:{alignItems:'center',backgroundColor:'rgba(0,0,0,0.56)',bottom:0,left:0,paddingBottom:34,paddingTop:16,position:'absolute',right:0},previewHint:{color:'#eee',fontSize:14,marginBottom:13},confirm:{alignItems:'center',backgroundColor:yellow,borderRadius:34,height:68,justifyContent:'center',width:68},backdrop:{backgroundColor:'rgba(0,0,0,0.67)',flex:1,justifyContent:'flex-end'},sheet:{backgroundColor:'#171717',borderTopLeftRadius:27,borderTopRightRadius:27,minHeight:'35%',paddingBottom:27,paddingHorizontal:20},assistantPosition:{justifyContent:'flex-end'},assistantSheet:{backgroundColor:'#171717',borderTopLeftRadius:27,borderTopRightRadius:27,minHeight:'35%',paddingBottom:28,paddingHorizontal:20},handle:{alignSelf:'center',backgroundColor:'#626262',borderRadius:3,height:5,marginBottom:17,marginTop:10,width:43},sheetHead:{alignItems:'center',flexDirection:'row',justifyContent:'space-between'},sheetTitle:{color:'#f5f5f5',fontSize:17,fontWeight:'800'},sheetSub:{color:'#a5a5a5',fontSize:12,marginTop:3},sheetClose:{alignItems:'center',backgroundColor:'#303030',borderRadius:17,height:34,justifyContent:'center',width:34},emptySheet:{color:'#aaa',fontSize:14,lineHeight:21,marginTop:23,textAlign:'center'},sheetRow:{alignItems:'center',borderBottomColor:'#303030',borderBottomWidth:1,flexDirection:'row',marginTop:16,paddingBottom:12},sheetImage:{borderRadius:8,height:50,marginRight:11,width:50},flex:{flex:1},rowTitle:{color:'#f5f5f5',fontSize:14,fontWeight:'700'},rowSub:{color:'#a5a5a5',fontSize:12,marginTop:3},assistantHead:{alignItems:'center',flexDirection:'row'},thumb:{borderRadius:7,height:37,marginRight:10,width:37},submitted:{color:'#c3c3c3',fontSize:13,marginTop:13},inputRow:{alignItems:'center',backgroundColor:'#292929',borderColor:'#414141',borderRadius:16,borderWidth:1,flexDirection:'row',marginTop:18,minHeight:54,paddingLeft:13},input:{color:'#f5f5f5',flex:1,fontSize:14,paddingVertical:10},mic:{alignItems:'center',height:42,justifyContent:'center',width:38},micActive:{backgroundColor:yellow,borderRadius:21},send:{alignItems:'center',backgroundColor:yellow,borderRadius:17,height:34,justifyContent:'center',marginRight:8,width:34},landing:{alignItems:'center',backgroundColor:'#050505',bottom:0,justifyContent:'center',left:0,position:'absolute',right:0,top:0,zIndex:10},lottieLanding:{height:95,width:95},loadingText:{color:'#eee',fontSize:14,fontWeight:'600',marginTop:4}
  ,previewChoiceRow:{alignItems:'center',flexDirection:'row',justifyContent:'space-between',width:180},previewSmallAction:{alignItems:'center',height:44,justifyContent:'center',width:44}
});

export default HomeScreen;
