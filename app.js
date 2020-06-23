'use strict';
$("#user-page").hide()
$("#call-page").hide()
let userId;
let token;
const socket = io('https://msc2.fireants.vip:1006');
let pc;
let pc2;
let servers = {
  iceServers: [
    {

      urls: ["turn:coturn.fireants.vip:3478"],
      username: "congvt",
      credential: "congvt123"
    },
    { urls: ["stun:stun.l.google.com:19302"] }
  ]
};

let remoteStream

const gotRemoteStream = (e) => {

  if (remoteStream !== e.streams[0]) {
    remoteStream = e.streams[0];


    // trace('Received remote stream');
}
}


const onSetLocalDescriptionSuccess = () => {
  // trace('localDescription success.');
}
const onSetLocalDescriptionError = (error) => {
  // trace('Failed to set setLocalDescription: ' + error.toString());
  console.log("onSetLocalDescriptionError", error)
}
const onCreateSessionDescriptionError = (error) => {
  // trace('Failed to create session description: ' + error.toString());
  console.log("onCreateSessionDescriptionError", error)
}




$("#login").click(() => {
  let phone = $("#phone-login").val();
  userId = phone
  token = phone

  // Goi ham register
  let body = {
    "userId": userId.toString(),
    "token": token
  }

  $.ajax({
    beforeSend: function (xhrObj) {
      xhrObj.setRequestHeader("userid", userId.toString());
      xhrObj.setRequestHeader("token", token);
    },
    url: "https://msc2.fireants.vip:1006/v0/subscribers",
    type: "POST",
    data: JSON.stringify(body),
    success: function (data) {
      if (data.error == 0) {
        $("#login-page").hide()
        $("#user-page").show()
        $("#call-page").show()
        $("#phoneShow").text(phone)

        $("#callButton").click(() => {
          let toCall = $("#toCall").val();
          navigator.mediaDevices.getUserMedia({ audio: true, video: true }).then(function (mediaStreamObj) {
            pc = new RTCPeerConnection(servers);
            pc.onicecandidate = function (e) {


              let message = {
                callingId: userId,
                calledId: toCall,
                type: "candidate_send",
                data: e.candidate,
                time: Date.now()
              };

              let data = {
                userId: userId,
                token: token,
                message: message
              }

              socket.emit('P_ROUTING',
                data
              );
            }





            pc.oniceconnectionstatechange = function (e) {

              if (pc) {
                //   trace('Camera ICE state: ' + pc.iceConnectionState);
                //   trace('ICE state change event: ', event);
                if (pc.iceConnectionState === 'connected' ||
                  pc.iceConnectionState === 'completed') {
                  pc.getStats(null).then(function (results) {
                    // figure out the peer's ip
                    var activeCandidatePair = null;
                    var remoteCandidate = null;

                    // search for the candidate pair
                    results.forEach(function (report) {
                      if (report.type === 'candidate-pair' && report.state === 'succeeded' &&
                        report.selected || report.type === 'googCandidatePair' &&
                        report.googActiveConnection === 'true') {
                        activeCandidatePair = report;
                      }
                    });
                    if (activeCandidatePair && activeCandidatePair.remoteCandidateId) {
                      results.forEach(function (report) {
                        if (report.type === 'remote-candidate' &&
                          report.id === activeCandidatePair.remoteCandidateId) {
                          remoteCandidate = report;
                        }
                      });
                    }
                    //         trace(remoteCandidate);
                    if (remoteCandidate && remoteCandidate.id) {
                      // TODO: update a div showing the remote ip/port?
                    }
                  });
                }



                if (pc && pc.iceConnectionState === 'connected') {
                }
              };
            }
            pc.oniceconnectionstatechange = function (e) {
              console.log(e);
            }

            remoteStream.getTracks().forEach(
              function (track) {
                pc.addTrack(
                  track,
                  mediaStreamObj
                );
              }
            );

            pc.createOffer(
              {
                offerToReceiveAudio: 1,
                offerToReceiveVideo: 1
              }
            ).then(
              (desc) => {
                pc.setLocalDescription(desc).then(
                  onSetLocalDescriptionSuccess,
                  onSetLocalDescriptionError
                );
                //    trace('Offer from Camera \n' + desc.sdp);
                //Todo CongVT Send OFER SDP to MediaServer
                // this.sendOfferSDP(data.callId, desc);
                //    trace("Da gui SDP cho Media Server");
                let message = {
                  callingId: userId,
                  calledId: toCall,
                  type: "sdp_send_offer",
                  data: desc,
                  time: Date.now()
                };

                let data = {
                  userId: userId,
                  token: token,
                  message: message
                }

                socket.emit('P_ROUTING',
                  data
                );

              },
              onCreateSessionDescriptionError
            );









          })
          // end of CALL click callback 


        })


      }
    },
    contentType: "application/json",
    dataType: 'json'
  });


})

socket.on('U_ROUTING', (data) => {
  if (data && data.message) {
    switch (data.message) {
      case "candidate_send_offer":
        {
          if (data.message.data) {
            pc.addIceCandidate(data.message.data)
          } else {
            pc.addIceCandidate('')
          }

        }
        break;
      case "sdp_send_answer":
        {
          pc.setRemoteDescription(data.message.data);
        }
        break;
      case "sdp_send_offer":
        {
          pc2 = new RTCPeerConnection(servers);
          pc2.onicecandidate = function (e) {


            let message = {
              callingId: userId,
              calledId: data.message.callingId,
              type: "candidate_receive",
              data: e.candidate,
              time: Date.now()
            };

            let data = {
              userId: userId,
              token: token,
              message: message
            }

            socket.emit('P_ROUTING',
              data
            );
          }

          pc2.oniceconnectionstatechange = function (e) {

            if (pc2) {
              //   trace('Camera ICE state: ' + pc.iceConnectionState);
              //   trace('ICE state change event: ', event);
              if (pc2.iceConnectionState === 'connected' ||
                pc2.iceConnectionState === 'completed') {
                pc2.getStats(null).then(function (results) {
                  // figure out the peer's ip
                  let activeCandidatePair = null;
                  let remoteCandidate = null;

                  // search for the candidate pair
                  results.forEach(function (report) {
                    if (report.type === 'candidate-pair' && report.state === 'succeeded' &&
                      report.selected || report.type === 'googCandidatePair' &&
                      report.googActiveConnection === 'true') {
                      activeCandidatePair = report;
                    }
                  });
                  if (activeCandidatePair && activeCandidatePair.remoteCandidateId) {
                    results.forEach(function (report) {
                      if (report.type === 'remote-candidate' &&
                        report.id === activeCandidatePair.remoteCandidateId) {
                        remoteCandidate = report;
                      }
                    });
                  }
                  //         trace(remoteCandidate);
                  if (remoteCandidate && remoteCandidate.id) {
                    // TODO: update a div showing the remote ip/port?
                  }
                });
              }



              if (pc2 && pc2.iceConnectionState === 'connected') {
              }
            };
          }
          pc2.oniceconnectionstatechange = function (e) {
            console.log(e);
          }
          

          pc2.ontrack = gotRemoteStream;
            // trace("User set Remote SDP")
            pc2.setRemoteDescription(data.message.data);
            pc2.createAnswer().then(
                function (desc) {
                    desc.sdp = desc.sdp.replace(/a=inactive/g, 'a=recvonly');
                    desc.type = 'answer';
                    pc2.setLocalDescription(desc).then(
                        onSetLocalDescriptionSuccess,
                        onSetLocalDescriptionError
                    );
                    // trace('Answer from Camera \n' + desc.sdp);

                    let message = {
                      callingId: userId,
                      calledId: data.message.callingId,
                      type: "sdp_send_answer",
                      data: desc,
                      time: Date.now()
                    };
    
                    let data = {
                      userId: userId,
                      token: token,
                      message: message
                    }
    
                    socket.emit('P_ROUTING',
                      data
                    );





                  //  socket.emit("CUST_SEND_OFFER_SDP", { "callId": data.callId, "sdp": desc });
                },
                onCreateSessionDescriptionError
            );



        }
        break;








    }
  }
})